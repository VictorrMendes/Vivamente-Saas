import type { AuthUser } from '@/types/auth';
import { ApiError } from './errors';

export interface OAuthSessionDto {
  idToken: string;
  expiresIn: number;
  user: AuthUser;
}

// Confirmado em backend/Oauth/apps/auth/serializers.py::RefreshResponseSerializer —
// o refresh nunca reenvia refreshToken nem user, só o novo idToken + validade.
export interface OAuthRefreshDto {
  idToken: string;
  expiresIn: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Valida a fronteira HTTP e seleciona somente os campos necessários à sessão.
 * refreshToken não vem mais no corpo — o Oauth emite ele como cookie httpOnly
 * (Set-Cookie em /oauth/v1/login), nunca legível por JS.
 */
export function mapOAuthSession(body: unknown): OAuthSessionDto {
  const data = isRecord(body) ? body.data : undefined;
  if (!isRecord(data) ||
      typeof data.idToken !== 'string' || !data.idToken.trim() ||
      typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
      !isRecord(data.user) || typeof data.user.id !== 'string' || !data.user.id.trim() ||
      typeof data.user.email !== 'string' || !data.user.email.trim() ||
      (data.user.role !== 'ADMIN' && data.user.role !== 'THERAPIST')) {
    // Não anexar o payload: ele pode conter credenciais ou dados pessoais.
    throw new ApiError(502, 'Resposta de autenticação inválida. Tente entrar novamente.');
  }
  return {
    idToken: data.idToken,
    expiresIn: data.expiresIn,
    user: { id: data.user.id, email: data.user.email, role: data.user.role },
  };
}

/** Mapper próprio do refresh — não exige (nem aceita) refreshToken/user no corpo. */
export function mapOAuthRefresh(body: unknown): OAuthRefreshDto {
  const data = isRecord(body) ? body.data : undefined;
  if (!isRecord(data) ||
      typeof data.idToken !== 'string' || !data.idToken.trim() ||
      typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0) {
    throw new ApiError(502, 'Resposta de autenticação inválida. Tente entrar novamente.');
  }
  return { idToken: data.idToken, expiresIn: data.expiresIn };
}

/** Valida a fronteira HTTP pra GET /oauth/v1/me — mesmos campos de AuthUser. */
export function mapOAuthMe(body: unknown): AuthUser {
  const data = isRecord(body) ? body.data : undefined;
  if (!isRecord(data) ||
      typeof data.id !== 'string' || !data.id.trim() ||
      typeof data.email !== 'string' || !data.email.trim() ||
      (data.role !== 'ADMIN' && data.role !== 'THERAPIST')) {
    throw new ApiError(502, 'Resposta de autenticação inválida. Tente entrar novamente.');
  }
  return { id: data.id, email: data.email, role: data.role };
}

function authErrorMessage(status: number, action: 'login' | 'refresh') {
  return status === 401
    ? (action === 'login' ? 'E-mail ou senha inválidos.' : 'Sessão expirada. Entre novamente.')
    : 'Não foi possível autenticar. Tente novamente em instantes.';
}

export async function requestOAuthLogin(input: { email: string; senha: string }): Promise<OAuthSessionDto> {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // O serializer real do Oauth espera o campo "password", não "senha".
    body: JSON.stringify({ email: input.email, password: input.senha }),
    cache: 'no-store',
    // Necessário pro browser aceitar o Set-Cookie do refresh token (httpOnly).
    credentials: 'include',
  });
  if (!res.ok) throw new ApiError(res.status, authErrorMessage(res.status, 'login'));
  return mapOAuthSession(await res.json().catch(() => undefined));
}

/** Sem parâmetros — o refresh token vai sozinho, no cookie httpOnly (nunca em JS). */
export async function requestOAuthRefresh(): Promise<OAuthRefreshDto> {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/refresh`, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) throw new ApiError(res.status, authErrorMessage(res.status, 'refresh'));
  return mapOAuthRefresh(await res.json().catch(() => undefined));
}

/**
 * Identidade do usuário logado. O refresh nunca devolve `user` (só idToken+
 * expiresIn) — um boot sem sessão em memória (reload) precisa desta chamada
 * separada, com o idToken recém-renovado, pra reconstituir a sessão por completo.
 */
export async function requestOAuthMe(idToken: string): Promise<AuthUser> {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, 'Não foi possível carregar os dados da conta.');
  return mapOAuthMe(await res.json().catch(() => undefined));
}

// Sempre "sucede" pro chamador (200) mesmo se o e-mail não existir — é o
// próprio backend (PasswordForgotView) que decide isso, contra enumeração de
// contas. Só um erro de rede/infra chega como ApiError aqui.
export async function requestPasswordForgot(input: { email: string }): Promise<{ sent: boolean }> {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/password/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, 'Não foi possível processar o pedido agora. Tente novamente em instantes.');
  const body = (await res.json().catch(() => undefined)) as { data?: { sent?: boolean } } | undefined;
  return { sent: body?.data?.sent === true };
}

export async function confirmPasswordReset(input: { token: string; newPassword: string }): Promise<{ reset: boolean }> {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 400) {
      throw new ApiError(res.status, 'Este link de redefinição é inválido ou expirou. Peça um novo.');
    }
    if (res.status === 429) {
      throw new ApiError(res.status, 'Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.');
    }
    throw new ApiError(res.status, 'Não foi possível redefinir a senha agora. Tente novamente em instantes.');
  }
  const body = (await res.json().catch(() => undefined)) as { data?: { reset?: boolean } } | undefined;
  return { reset: body?.data?.reset === true };
}
