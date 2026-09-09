import type { AuthUser } from '@/types/auth';
import { ApiError } from './errors';

export interface OAuthSessionDto {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
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

export async function requestOAuthSession(action: 'login' | 'refresh', input: unknown) {
  const res = await fetch(`${import.meta.env.VITE_OAUTH_API_URL}/oauth/v1/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  if (!res.ok) {
    // Mensagens fixas impedem que erros internos do OAuth apareçam na tela.
    const message = res.status === 401
      ? (action === 'login' ? 'E-mail ou senha inválidos.' : 'Sessão expirada. Entre novamente.')
      : 'Não foi possível autenticar. Tente novamente em instantes.';
    throw new ApiError(res.status, message);
  }
  return mapOAuthSession(await res.json().catch(() => undefined));
}
