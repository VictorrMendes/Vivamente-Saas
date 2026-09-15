import type { AuthUser } from '@/types/auth';
import { ApiError } from './errors';

export interface OAuthSessionDto {
  idToken: string;
  refreshToken: string;
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

/** Valida a fronteira HTTP e seleciona somente os campos necessários à sessão. */
export function mapOAuthSession(body: unknown): OAuthSessionDto {
  const data = isRecord(body) ? body.data : undefined;
  if (!isRecord(data) ||
      typeof data.idToken !== 'string' || !data.idToken.trim() ||
      typeof data.refreshToken !== 'string' || !data.refreshToken.trim() ||
      typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
      !isRecord(data.user) || typeof data.user.id !== 'string' || !data.user.id.trim() ||
      typeof data.user.email !== 'string' || !data.user.email.trim() ||
      (data.user.role !== 'ADMIN' && data.user.role !== 'THERAPIST')) {
    // Não anexar o payload: ele pode conter credenciais ou dados pessoais.
    throw new ApiError(502, 'Resposta de autenticação inválida. Tente entrar novamente.');
  }
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
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
  });
  if (!res.ok) throw new ApiError(res.status, authErrorMessage(res.status, 'login'));
  return mapOAuthSession(await res.json().catch(() => undefined));
}

export async function requestOAuthRefresh(input: { refreshToken: string }): Promise<OAuthRefreshDto> {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, authErrorMessage(res.status, 'refresh'));
  return mapOAuthRefresh(await res.json().catch(() => undefined));
}
