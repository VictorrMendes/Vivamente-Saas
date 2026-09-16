import { useAuthStore } from '@/stores/auth';
import { router } from '@/router';
import { ApiError } from './errors';
import { parseErrorMessage } from './problemDetails';
import { deepCamelCase, deepSnakeCase } from './caseConvert';

const OAUTH_URL = import.meta.env.VITE_OAUTH_API_URL as string;
const BACK_URL = import.meta.env.VITE_BACK_API_URL as string;

interface RequestOptions extends RequestInit {
  /** Anexa o Bearer token e tenta refresh em 401. Default true. */
  auth?: boolean;
}

/** Corpo em JSON (string) sai em snake_case pro Back; FormData passa direto. */
function toWireBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (typeof body !== 'string') return body;
  try {
    return JSON.stringify(deepSnakeCase(JSON.parse(body)));
  } catch {
    return body;
  }
}

/** Só o payload em `data` vira camelCase — meta/pagination já batem com nossos tipos. */
function fromWireBody(json: unknown): unknown {
  if (isPlainObject(json) && 'data' in json) {
    return { ...json, data: deepCamelCase(json.data) };
  }
  return deepCamelCase(json);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function request<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const auth = useAuthStore();
  const { auth: withAuth = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (withAuth) {
    requestHeaders.delete('Authorization');
    if (auth.idToken) requestHeaders.set('Authorization', `Bearer ${auth.idToken}`);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    body: toWireBody(rest.body),
    headers: requestHeaders,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(res.status, parseErrorMessage(body, res.statusText), body);
  }
  if (res.status === 204) return undefined as T;
  return fromWireBody(await res.json()) as Promise<T>;
}

/**
 * Repete a requisição original uma vez após renovar a sessão em 401. Se o
 * refresh também falhar, limpa a sessão e manda pro /login preservando a
 * rota que o usuário tentou acessar (pra voltar pra lá depois de logar).
 */
async function withRefresh<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const auth = useAuthStore();
  const version = auth.sessionVersion;
  const token = auth.idToken;
  try {
    return await request<T>(baseUrl, path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && options.auth !== false) {
      // Uma resposta da sessão anterior não pode renovar/encerrar a atual.
      if (version !== auth.sessionVersion) throw err;
      try {
        // Um 401 atrasado pode chegar depois da renovação de outra requisição.
        if (token === auth.idToken) await auth.refresh();
        if (version !== auth.sessionVersion) throw err;
        return await request<T>(baseUrl, path, options);
      } catch (retryError) {
        if ((retryError instanceof ApiError && retryError.status === 401) || !auth.isAuthenticated) {
          if (version === auth.sessionVersion) auth.clearSession();
          if (!auth.isAuthenticated && router.currentRoute.value.name !== 'login') {
            const redirect = router.currentRoute.value.fullPath;
            await router.replace({ name: 'login', query: { redirect } });
          }
        }
        throw retryError;
      }
    }
    throw err;
  }
}

export const oauthApi = <T>(path: string, options?: RequestOptions) => withRefresh<T>(OAUTH_URL, path, options);
export const backApi = <T>(path: string, options?: RequestOptions) => withRefresh<T>(BACK_URL, path, options);

export { ApiError };
