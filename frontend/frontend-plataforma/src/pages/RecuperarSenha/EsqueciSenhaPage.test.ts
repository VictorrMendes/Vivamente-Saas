import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import EsqueciSenhaPage from './EsqueciSenhaPage.vue';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/esqueci-senha', name: 'esqueci-senha', component: EsqueciSenhaPage },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
    ],
  });
}

async function renderPage() {
  const router = buildRouter();
  router.push('/esqueci-senha');
  await router.isReady();
  return mount(EsqueciSenhaPage, { global: { plugins: [router] } });
}

describe('EsqueciSenhaPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mostra a mesma mensagem de sucesso independente do e-mail existir (anti-enumeração)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { sent: true } }))));
    const wrapper = await renderPage();
    await wrapper.find('#forgot-email').setValue('alguem@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('receber um link');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/oauth/v1/password/forgot'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('mostra mensagem genérica em erro de conexão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const wrapper = await renderPage();
    await wrapper.find('#forgot-email').setValue('alguem@example.com');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível processar o pedido agora');
  });
});
