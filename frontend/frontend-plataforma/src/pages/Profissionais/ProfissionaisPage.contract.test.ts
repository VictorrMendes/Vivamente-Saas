import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ProfissionaisPage from './ProfissionaisPage.vue';

describe('Profissionais — contrato real de leitura', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify({
      data: url.includes('/specialties')
        ? [{ id: 7, name: 'Psicologia' }]
        : [{ id: 1, user: 2, full_name: 'Terapeuta de teste', slug: 'teste', bio: '',
          is_public: true, specialties: [{ id: 7, name: 'Psicologia' }] }],
      pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 },
    }))));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('exibe profissionais e permite abrir/cancelar cadastro e navegar sem recarregar', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/profissionais', component: ProfissionaisPage },
      { path: '/profissionais/:id', component: { template: '<div>Detalhe</div>' } },
    ] });
    await router.push('/profissionais');
    const wrapper = mount(ProfissionaisPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('Terapeuta de teste');
    expect(wrapper.text()).toContain('Psicologia');
    const toggle = () => wrapper.findAll('button').find((button) => /Novo profissional|Cancelar/.test(button.text()))!;
    await toggle().trigger('click');
    expect(wrapper.find('#prof-user-search').exists()).toBe(true);
    await toggle().trigger('click');
    expect(wrapper.find('#prof-user-search').exists()).toBe(false);
    await wrapper.get('a[href="/profissionais/1"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/profissionais/1');
    wrapper.unmount();
  });
});
