import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import LoginPage from './LoginPage.vue';
import { useAuthStore } from '@/stores/auth';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginPage },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div>dashboard</div>' } },
      { path: '/agenda', name: 'agenda', component: { template: '<div>agenda</div>' } },
    ],
  });
}

async function renderPage(path = '/login') {
  const router = buildRouter();
  router.push(path);
  await router.isReady();
  return mount(LoginPage, { global: { plugins: [router] } });
}

describe('LoginPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renderiza os campos de e-mail, senha e o botão de entrar', async () => {
    const wrapper = await renderPage();
    expect(wrapper.find('#email').exists()).toBe(true);
    expect(wrapper.find('#password').exists()).toBe(true);
    expect(wrapper.find('button[type=submit]').text()).toContain('Entrar');
  });

  it('mostra estado de carregamento durante o login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const wrapper = await renderPage();
    await wrapper.find('#email').setValue('pessoa@example.com');
    await wrapper.find('#password').setValue('senha-qualquer');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('button[type=submit]').text()).toContain('Entrando');
    expect(wrapper.find('form').attributes('aria-busy')).toBe('true');
    expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeDefined();
    await wrapper.find('form').trigger('submit.prevent');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('mostra mensagem de credenciais inválidas (RFC 9457)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'E-mail ou senha inválidos.' }), { status: 401 })),
    );
    const wrapper = await renderPage();
    await wrapper.find('#email').setValue('pessoa@example.com');
    await wrapper.find('#password').setValue('senha-errada');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('E-mail ou senha inválidos.');
    expect(wrapper.find('#email').attributes('aria-describedby')).toBe('login-error');
    expect(wrapper.find('#login-error').attributes('role')).toBe('alert');
  });

  it.each([
    ['/agenda?dia=2026-09-05#lista', '/agenda?dia=2026-09-05#lista'],
    ['//example.com', '/dashboard'],
  ])('autentica pelo OAuth e volta ao destino permitido: %s', async (destination, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      idToken: 'test-token', expiresIn: 3600,
      user: { id: '1', email: 'test@example.com', role: 'THERAPIST' },
    } }))));
    const wrapper = await renderPage(`/login?redirect=${encodeURIComponent(destination)}`);
    await wrapper.find('#email').setValue('test@example.com');
    await wrapper.find('#password').setValue('test-password');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(useAuthStore().isAuthenticated).toBe(true);
    expect(wrapper.vm.$router.currentRoute.value.fullPath).toBe(expected);
    wrapper.unmount();
  });

  it('mostra mensagem genérica em erro de conexão (backend fora do ar)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    const wrapper = await renderPage();
    await wrapper.find('#email').setValue('pessoa@example.com');
    await wrapper.find('#password').setValue('senha-qualquer');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível entrar. Tente novamente.');
  });
});
