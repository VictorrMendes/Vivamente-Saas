import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { router } from './index';
import { useAuthStore } from '@/stores/auth';

describe('router — guarda de autenticação e RBAC', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push('/login');
    await router.isReady();
  });

  it('redireciona pra /login preservando a rota de destino quando não autenticado', async () => {
    await router.push('/agenda');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/agenda');
  });

  it('deixa passar quando autenticado', async () => {
    const auth = useAuthStore();
    auth.$patch({ idToken: 'tok', user: { id: '1', email: 'admin@vivamente.dev', role: 'ADMIN' } });

    await router.push('/agenda');
    expect(router.currentRoute.value.name).toBe('agenda');
  });

  it('bloqueia rota exclusiva de ADMIN pra role THERAPIST', async () => {
    const auth = useAuthStore();
    auth.$patch({ idToken: 'tok', user: { id: '2', email: 'terapeuta@vivamente.dev', role: 'THERAPIST' } });

    await router.push('/profissionais');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('permite Minha Página pra THERAPIST mas bloqueia pra ADMIN', async () => {
    const auth = useAuthStore();
    auth.$patch({ idToken: 'tok', user: { id: '2', email: 'terapeuta@vivamente.dev', role: 'THERAPIST' } });
    await router.push('/minha-pagina');
    expect(router.currentRoute.value.name).toBe('minha-pagina');

    auth.$patch({ user: { id: '1', email: 'admin@vivamente.dev', role: 'ADMIN' } });
    await router.push('/agenda');
    await router.push('/minha-pagina');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('redireciona usuário já autenticado que acessa /login pro dashboard', async () => {
    const auth = useAuthStore();
    auth.$patch({ idToken: 'tok', user: { id: '1', email: 'admin@vivamente.dev', role: 'ADMIN' } });

    await router.push('/agenda');
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('preserva query e fragmento da rota solicitada', async () => {
    await router.push('/agenda?dia=2026-09-05#lista');
    expect(router.currentRoute.value.query.redirect).toBe('/agenda?dia=2026-09-05#lista');
  });

  it('bloqueia acesso direto ao detalhe administrativo para terapeuta', async () => {
    useAuthStore().mockLogin('THERAPIST');
    await router.push('/profissionais/1');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('bloqueia rota com papel ausente', async () => {
    useAuthStore().$patch({ idToken: 'tok', user: { id: '1', email: 'test@example.com' } });
    await router.push('/profissionais');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});
