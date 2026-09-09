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

  it('atualiza tokens, usuário e validade do envelope completo no refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
        idToken: 'novo-token', refreshToken: 'novo-refresh', expiresIn: 7200,
        user: { id: '1', email: 'test@example.com', role: 'THERAPIST' },
      } }), { status: 200 })),
    );

    const auth = useAuthStore();
    auth.$patch({ refreshToken: 'ref-valido' });
    await auth.refresh();

    expect(auth.idToken).toBe('novo-token');
    expect(auth.refreshToken).toBe('novo-refresh');
    expect(auth.role).toBe('THERAPIST');
    expect(auth.expiresAt).toBeGreaterThan(Date.now() + 7190000);
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
    resolve(new Response(JSON.stringify({ data: {
      idToken: 'late-token', refreshToken: 'late-refresh', expiresIn: 3600,
      user: { id: '1', email: 'test@example.com', role: 'ADMIN' },
    } })));
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
