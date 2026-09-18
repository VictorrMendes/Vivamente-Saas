import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import RedefinirSenhaPage from './RedefinirSenhaPage.vue';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/redefinir-senha', name: 'redefinir-senha', component: RedefinirSenhaPage },
      { path: '/esqueci-senha', name: 'esqueci-senha', component: { template: '<div>esqueci</div>' } },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
    ],
  });
}

async function renderPage(query = '?oobCode=codigo-valido') {
  const router = buildRouter();
  router.push(`/redefinir-senha${query}`);
  await router.isReady();
  return mount(RedefinirSenhaPage, { global: { plugins: [router] } });
}

describe('RedefinirSenhaPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sem oobCode na URL, mostra link inválido em vez do formulário', async () => {
    const wrapper = await renderPage('');
    expect(wrapper.text()).toContain('inválido');
    expect(wrapper.find('#reset-password').exists()).toBe(false);
  });

  it('redefine a senha e mostra confirmação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { reset: true } }))));
    const wrapper = await renderPage();
    await wrapper.find('#reset-password').setValue('novaSenha123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Senha redefinida');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/oauth/v1/password/reset'),
      expect.objectContaining({ body: JSON.stringify({ token: 'codigo-valido', newPassword: 'novaSenha123' }) }),
    );
  });

  it('token inválido/expirado mostra mensagem específica', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'invalido' }), { status: 400 })));
    const wrapper = await renderPage();
    await wrapper.find('#reset-password').setValue('novaSenha123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('inválido ou expirou');
  });

  it('valida tamanho mínimo da senha antes de chamar o Back', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = await renderPage();
    await wrapper.find('#reset-password').setValue('123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('pelo menos 6 caracteres');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [429, 'Muitas tentativas'],
    [500, 'Não foi possível redefinir a senha agora'],
    [503, 'Não foi possível redefinir a senha agora'],
  ])('HTTP %i permite tentar novamente sem apresentar link expirado', async (status, message) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'detalhe interno' }), { status: Number(status) }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { reset: true } })));
    vi.stubGlobal('fetch', fetchMock);
    const wrapper = await renderPage();
    await wrapper.find('#reset-password').setValue('novaSenha123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain(message);
    expect(wrapper.text()).not.toContain('inválido ou expirou');
    expect(wrapper.text()).not.toContain('detalhe interno');
    expect(wrapper.text()).not.toContain('Senha redefinida');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.text()).toContain('Senha redefinida');
  });

  it('falha de rede não apresenta link expirado nem sucesso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const wrapper = await renderPage();
    await wrapper.find('#reset-password').setValue('novaSenha123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('Não foi possível redefinir a senha agora');
    expect(wrapper.text()).not.toContain('inválido ou expirou');
    expect(wrapper.text()).not.toContain('Senha redefinida');
  });
});
