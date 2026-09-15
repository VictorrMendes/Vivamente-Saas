import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from './auth';

describe('authStore — envelope do Oauth', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('desembrulha { data: {...} } no login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              idToken: 'tok',
              refreshToken: 'ref',
              expiresIn: 3600,
              user: { id: '1', email: 'admin@vivamente.dev', role: 'ADMIN' },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const auth = useAuthStore();
    await auth.login('admin@vivamente.dev', 'senha123');

    expect(auth.idToken).toBe('tok');
    expect(auth.refreshToken).toBe('ref');
    expect(auth.user?.email).toBe('admin@vivamente.dev');
    expect(auth.isAuthenticated).toBe(true);
  });

  it('no refresh, atualiza só idToken/expiresAt e preserva user/refreshToken (contrato real do Back só devolve idToken+expiresIn)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { idToken: 'novo-token', expiresIn: 7200 } }), { status: 200 })),
    );

    const auth = useAuthStore();
    auth.$patch({
      idToken: 'antigo-token',
      refreshToken: 'ref-valido',
      user: { id: '1', email: 'test@example.com', role: 'THERAPIST' },
    });
    await auth.refresh();

    expect(auth.idToken).toBe('novo-token');
    expect(auth.refreshToken).toBe('ref-valido');
    expect(auth.user?.email).toBe('test@example.com');
    expect(auth.role).toBe('THERAPIST');
    expect(auth.expiresAt).toBeGreaterThan(Date.now() + 7190000);
  });

  it('envia o campo "password" (não "senha") no corpo do login, conforme o serializer real do Oauth', async () => {
    let sentBody: unknown;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        sentBody = JSON.parse(init.body as string);
        return Promise.resolve(new Response(JSON.stringify({
          data: { idToken: 'tok', refreshToken: 'ref', expiresIn: 3600, user: { id: '1', email: 'a@a.com', role: 'ADMIN' } },
        }), { status: 200 }));
      }),
    );

    const auth = useAuthStore();
    await auth.login('a@a.com', 'minhasenha');

    expect(sentBody).toEqual({ email: 'a@a.com', password: 'minhasenha' });
  });

  it('limpa a sessão imediatamente mesmo se logout remoto falhar', async () => {
    const auth = useAuthStore();
    auth.mockLogin();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const logout = auth.logout();
    expect(auth.idToken).toBeNull();
    expect(auth.refreshToken).toBeNull();
    await expect(logout).resolves.toBeUndefined();
  });

  it('não restaura a sessão se logout ocorrer durante refresh', async () => {
    const auth = useAuthStore();
    auth.mockLogin();
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const refreshing = auth.refresh();
    auth.clearSession();
    resolve(new Response(JSON.stringify({ data: { idToken: 'late-token', expiresIn: 3600 } })));
    await expect(refreshing).rejects.toThrow('Sessão encerrada');
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.refreshToken).toBeNull();
  });

  it('não persiste tokens no armazenamento do navegador', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const auth = useAuthStore();
    auth.mockLogin();
    auth.clearSession();
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it('lança erro com mensagem legível (RFC 9457) em credenciais inválidas, nunca o JSON cru', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'E-mail ou senha inválidos.' }), { status: 401 })),
    );

    const auth = useAuthStore();
    await expect(auth.login('admin@vivamente.dev', 'errada')).rejects.toThrow('E-mail ou senha inválidos.');
    expect(auth.isAuthenticated).toBe(false);
  });
});
