import { useAuthStore } from '@/stores/auth';
import { ApiError } from './errors';

const OAUTH_URL = import.meta.env.VITE_OAUTH_API_URL as string;
const BACK_URL = import.meta.env.VITE_BACK_API_URL as string;

interface RequestOptions extends RequestInit {
  /** Anexa o Bearer token e tenta refresh em 401. Default true. */
  auth?: boolean;
}

async function request<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const auth = useAuthStore();
  const { auth: withAuth = true, headers, ...rest } = options;

  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth && auth.idToken ? { Authorization: `Bearer ${auth.idToken}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new ApiError(res.status, body?.message ?? res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Repete a requisição original uma vez após renovar a sessão em 401. */
async function withRefresh<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await request<T>(baseUrl, path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && options.auth !== false) {
      const auth = useAuthStore();
      try {
        await auth.refresh();
      } catch {
        await auth.logout();
        throw err;
      }
      return request<T>(baseUrl, path, options);
    }
    throw err;
  }
}

export const oauthApi = <T>(path: string, options?: RequestOptions) => withRefresh<T>(OAUTH_URL, path, options);
export const backApi = <T>(path: string, options?: RequestOptions) => withRefresh<T>(BACK_URL, path, options);

export { ApiError };
