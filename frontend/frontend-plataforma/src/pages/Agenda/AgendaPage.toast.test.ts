import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AgendaPage from './AgendaPage.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
// Hoje: a agenda lista o dia selecionado (padrão: hoje).
const soon = new Date();
const pending = { id: 7, professional: 1, client: 42, service: null, package: null, starts_at: soon.toISOString(), ends_at: new Date(soon.getTime() + 3000000).toISOString(),
  status: 'PENDING', modality: '', call_link: '', price: null, notes: '', created_at: soon.toISOString() };
const page = (data: unknown[]) => ({ data, pagination: { page: 1, per_page: 100, total: data.length, total_pages: 1 } });

describe('AgendaPage — erros viram toast', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
    // v-calendar observa o tamanho do elemento; o jsdom não tem ResizeObserver.
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  });
  afterEach(() => { vi.unstubAllGlobals(); useToast().toasts.forEach((t) => useToast().dismiss(t.id)); });

  it('WhatsApp ausente: toast com a causa do Back e atalho pro cadastro; nada de texto solto na página', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/request-confirmation') && init?.method === 'POST') {
        return Promise.resolve(json({ detail: 'Cadastre o WhatsApp do cliente com DDD e código do país.' }, 400));
      }
      return Promise.resolve(json(url.includes('/appointments') ? page([pending]) : page([])));
    }));
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/agenda', component: AgendaPage }, { path: '/clientes/:id', component: { template: '<div/>' } }] });
    router.push('/agenda');
    await router.isReady();
    const host = mount(ToastHost, { global: { plugins: [router] } });
    const wrapper = mount(AgendaPage, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.findAll('button').find((b) => b.text() === 'Solicitar confirmação')!.trigger('click');
    await flushPromises();

    expect(host.text()).toContain('Cadastre o WhatsApp do cliente com DDD e código do país.');
    expect(host.find('[role="alert"]').exists()).toBe(true);
    expect(host.find('a[href="/clientes/42"]').text()).toContain('Abrir cadastro do cliente');
    expect(wrapper.text()).not.toContain('Cadastre o WhatsApp');
  });

  it('salvar consulta: conflito de horário vira toast de erro (não texto no formulário) e depois de salvar mostra toast de sucesso', async () => {
    let posts = 0;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/api/v1/appointments') && init?.method === 'POST') {
        posts += 1;
        return Promise.resolve(posts === 1
          ? json({ detail: 'starts_at: Já existe um agendamento nesse horário para este profissional.' }, 400)
          : json({ data: { ...pending, id: 8 } }, 201));
      }
      if (url.includes('/clients')) return Promise.resolve(json(page([{ id: 42, name: 'Ana', email: '', phone: '', created_at: 'x' }])));
      return Promise.resolve(json(page([])));
    }));
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/agenda', component: AgendaPage }] });
    router.push('/agenda');
    await router.isReady();
    const host = mount(ToastHost, { global: { plugins: [router] } });
    const wrapper = mount(AgendaPage, { global: { plugins: [router] } });
    await flushPromises();

    await wrapper.findAll('button').find((b) => b.text() === '+ Nova consulta')!.trigger('click');
    await wrapper.find('form select').setValue('42');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(host.text()).toContain('Já existe um agendamento nesse horário');
    expect(wrapper.text()).not.toContain('Já existe um agendamento');

    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(host.text()).toContain('Consulta agendada.');
  });
});
