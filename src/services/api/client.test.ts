import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/router', () => ({
  router: { replace: vi.fn(), currentRoute: { value: { name: 'agenda', fullPath: '/agenda?dia=2026-09-05#lista' } } },
}));
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth';
import { ApiError, backApi, oauthApi } from './client';

const session = {
  idToken: 'new-token', refreshToken: 'new-refresh', expiresIn: 3600,
  user: { id: '1', email: 'test@example.com', role: 'THERAPIST' },
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const unauthorized = () => json({ title: 'Unauthorized', status: 401 }, 401);

describe('client — renovação e expiração', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([backApi, oauthApi])('renova uma vez, repete corpo e usa o novo Bearer (%#)', async (api) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json({ data: session })).mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const body = JSON.stringify({ status: 'confirmed' });
    await expect(api('/resource', { method: 'PATCH', body, headers: new Headers({ 'X-Test': 'yes' }) }))
      .resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retry = fetchMock.mock.calls[2]![1];
    expect(retry.body).toBe(body);
    expect(retry.method).toBe('PATCH');
    expect(retry.headers.get('Authorization')).toBe('Bearer new-token');
    expect(retry.headers.get('X-Test')).toBe('yes');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each(['401', 'network', 'malformed'])('limpa sessão e preserva destino se refresh falhar: %s', async (failure) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized());
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    else fetchMock.mockResolvedValueOnce(failure === '401' ? unauthorized() : json({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(backApi('/resource')).rejects.toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(useAuthStore().isAuthenticated).toBe(false);
    expect(useAuthStore().refreshToken).toBeNull();
    expect(router.replace).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/agenda?dia=2026-09-05#lista' } });
  });

  it('encerra sessão se a repetição também retornar 401, sem segundo refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json({ data: session })).mockResolvedValueOnce(unauthorized());
    vi.stubGlobal('fetch', fetchMock);
    await expect(backApi('/resource')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(useAuthStore().isAuthenticated).toBe(false);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it('compartilha um único refresh entre 401 simultâneos', async () => {
    const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/refresh')) return json({ data: session });
      return new Headers(options.headers).get('Authorization') === 'Bearer new-token' ? json({ ok: true }) : unauthorized();
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await Promise.all([backApi('/a'), backApi('/b'), backApi('/c')]))
      .toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/refresh'))).toHaveLength(1);
  });

  it('não renova novamente quando um 401 atrasado usa o token anterior', async () => {
    let resolveLate!: (value: Response) => void;
    const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/refresh')) return json({ data: session });
      if (new Headers(options.headers).get('Authorization') === 'Bearer new-token') return json({ ok: true });
      if (url.endsWith('/late')) return new Promise<Response>((resolve) => { resolveLate = resolve; });
      return unauthorized();
    });
    vi.stubGlobal('fetch', fetchMock);
    const late = backApi('/late');
    await backApi('/first');
    resolveLate(unauthorized());
    await expect(late).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/refresh'))).toHaveLength(1);
  });

  it('não aplica 401 da sessão anterior sobre um novo login', async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal('fetch', fetchMock);
    const request = backApi('/resource');
    useAuthStore().mockLogin('ADMIN');
    resolve(unauthorized());
    await expect(request).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore().role).toBe('ADMIN');
    expect(router.replace).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('não anexa token nem renova chamadas públicas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(unauthorized());
    vi.stubGlobal('fetch', fetchMock);
    await expect(backApi('/public', { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].headers.has('Authorization')).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('mantém RFC 9457 e não renova em 403', async () => {
    const body = { type: 'about:blank', title: 'Forbidden', status: 403, detail: 'Sem permissão.' };
    const fetchMock = vi.fn().mockResolvedValue(json(body, 403));
    vi.stubGlobal('fetch', fetchMock);
    await expect(backApi('/resource')).rejects.toMatchObject({ status: 403, message: 'Sem permissão.', body });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore().isAuthenticated).toBe(true);
  });

  it('mantém sessão se a repetição falhar com 500', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json({ data: session })).mockResolvedValueOnce(json({}, 500));
    vi.stubGlobal('fetch', fetchMock);
    await expect(backApi('/resource')).rejects.toMatchObject({ status: 500 });
    expect(useAuthStore().isAuthenticated).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('aceita 204 sem tentar ler JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(backApi('/resource', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
