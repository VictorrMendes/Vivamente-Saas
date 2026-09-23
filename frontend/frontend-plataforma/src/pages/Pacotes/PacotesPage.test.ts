import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import PacotesPage from './PacotesPage.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const json = (body: unknown) => new Response(JSON.stringify(body));
const page = (data: unknown[]) => ({ data, pagination: { page: 1, per_page: 100, total: data.length, total_pages: 1 } });
const plan = { id: 7, professional: 1, service: null, name: 'Plano 4 sessões', description: '', total_sessions: 4, total_value: '600.00', validity_days: 60 };

async function render() {
  setActivePinia(createPinia());
  useAuthStore().mockLogin('THERAPIST');
  const calls: { url: string; method?: string; body?: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(init.body as string) : undefined });
    if (url.includes('/package-plans/7') && init?.method === 'PATCH') {
      return Promise.resolve(json({ data: { ...plan, name: 'Plano Premium', total_value: '900.00' } }));
    }
    return Promise.resolve(json(page(url.includes('/package-plans') ? [plan] : [])));
  }));
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/pacotes', component: PacotesPage }, { path: '/clientes', component: { template: '<div/>' } }] });
  router.push('/pacotes');
  await router.isReady();
  const wrapper = mount(PacotesPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, calls };
}

describe('PacotesPage — catálogo de pacotes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useToast().toasts.forEach((t) => useToast().dismiss(t.id));
  });

  it('lista os modelos com valor por sessão e validade', async () => {
    const { wrapper } = await render();
    expect(wrapper.text()).toContain('Plano 4 sessões');
    expect(wrapper.text()).toContain('4 sessões');
    expect(wrapper.text()).toContain('Validade de 60 dias');
  });

  it('Editar abre o formulário preenchido, salva via PATCH e atualiza o cartão', async () => {
    const { wrapper, calls } = await render();
    await wrapper.findAll('button').find((b) => b.text() === 'Editar')!.trigger('click');

    const name = wrapper.find('input[placeholder^="Ex.: Pacote mensal"]');
    expect((name.element as HTMLInputElement).value).toBe('Plano 4 sessões');
    await name.setValue('Plano Premium');
    const value = wrapper.findAll('input[type="number"]')[1]!;
    await value.setValue('900');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.body).toMatchObject({ name: 'Plano Premium', total_value: '900.00', total_sessions: 4 });
    expect(wrapper.text()).toContain('Plano Premium');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(useToast().toasts.some((t) => t.kind === 'success')).toBe(true);
  });

  it('não salva com nome vazio', async () => {
    const { wrapper, calls } = await render();
    await wrapper.findAll('button').find((b) => b.text() === 'Editar')!.trigger('click');
    await wrapper.find('input[placeholder^="Ex.: Pacote mensal"]').setValue('');
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.text()).toContain('Informe o nome do pacote.');
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  });
});
