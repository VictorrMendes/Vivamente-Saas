import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Neste arquivo, router/index.ts SÓ é importado dinamicamente (nunca
// estaticamente) - o guard tenta a renovação silenciosa UMA vez por boot
// (flag no escopo do módulo); se o módulo já tivesse um binding estático
// aqui, vi.resetModules() não conseguiria forçar uma reavaliação de verdade
// pra resetar essa flag.
describe('router — restauração de sessão no boot (reload com cookie httpOnly válido)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reload com refresh válido restaura a sessão antes de decidir redirecionar', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(
      url.includes('/oauth/v1/me')
        ? new Response(JSON.stringify({ data: { id: '1', email: 'ana@x.com', role: 'THERAPIST' } }))
        : new Response(JSON.stringify({ data: { idToken: 'restaurado', expiresIn: 3600 } })),
    )));
    setActivePinia(createPinia());
    const { router } = await import('./index');
    const { useAuthStore } = await import('@/stores/auth');

    await router.push('/agenda');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('agenda');
    expect(useAuthStore().isAuthenticated).toBe(true);
  });

  it('reload sem sessão válida (refresh falha) mantém o redirect pro login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    setActivePinia(createPinia());
    const { router } = await import('./index');

    await router.push('/agenda');
    await router.isReady();

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/agenda');
  });

  it('reload de sessão do atalho de dev (sem cookie do Oauth) refaz o login de dev em vez de deslogar', async () => {
    sessionStorage.setItem('vm-dev-backdoor-role', 'THERAPIST');
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(
      url.includes('/dev/fake-token')
        ? new Response(JSON.stringify({ token: 'jwt-dev', uid: 'seed-therapist-1', email: 't@x.com', role: 'THERAPIST' }))
        : new Response('{}', { status: 401 }),
    )));
    setActivePinia(createPinia());
    const { router } = await import('./index');
    const { useAuthStore } = await import('@/stores/auth');

    await router.push('/agenda');

    expect(router.currentRoute.value.name).toBe('agenda');
    expect(useAuthStore().idToken).toBe('jwt-dev');
    sessionStorage.clear();
  });

  it('logout apaga a marca de dev: o próximo reload não reloga sozinho', async () => {
    sessionStorage.setItem('vm-dev-backdoor-role', 'ADMIN');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    setActivePinia(createPinia());
    const { useAuthStore } = await import('@/stores/auth');
    await useAuthStore().logout();
    expect(sessionStorage.getItem('vm-dev-backdoor-role')).toBeNull();
  });
});
