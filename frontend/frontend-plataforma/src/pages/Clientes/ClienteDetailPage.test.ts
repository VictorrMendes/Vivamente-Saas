import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ClienteDetailPage from './ClienteDetailPage.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/clientes', name: 'clientes', component: { template: '<div>clientes</div>' } },
      { path: '/clientes/:id', name: 'cliente-detail', component: ClienteDetailPage, props: true },
    ],
  });
}

const json = (body: unknown) => new Response(JSON.stringify(body));

// Prontuário é dado clínico sensível — só o terapeuta responsável acessa (nunca ADMIN, sem bypass, ver apps/clinical_records/views.py::IsTherapist).
function stubFetch() {
  return vi.fn((url: string) => {
    const now = '2026-09-10T10:00:00Z';
    if (url.includes('/clinical-records')) return Promise.resolve(json({ data: [{ id: 1, client: 1, professional: 1, content: 'Nota.', recordedAt: now, createdAt: now }] }));
    if (url.includes('/appointments')) return Promise.resolve(json({ data: [], pagination: { page: 1, per_page: 50, total: 0, total_pages: 1 } }));
    if (url.includes('/services')) return Promise.resolve(json({ data: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 1 } }));
    if (url.includes('/clients/1')) return Promise.resolve(json({ data: { id: 1, name: 'Maria Souza', email: 'maria@x.com', phone: '11999999999', createdAt: now } }));
    return Promise.resolve(json({ data: {} }));
  });
}

async function renderPage(role: 'ADMIN' | 'THERAPIST') {
  setActivePinia(createPinia());
  useAuthStore().mockLogin(role);
  vi.stubGlobal('fetch', stubFetch());
  const router = buildRouter();
  router.push('/clientes/1');
  await router.isReady();
  const wrapper = mount(ClienteDetailPage, { global: { plugins: [router] }, props: { id: '1' } });
  await flushPromises();
  return wrapper;
}

describe('ClienteDetailPage — bloqueio visual do Prontuário pra ADMIN', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('THERAPIST vê a seção de Prontuário', async () => {
    const wrapper = await renderPage('THERAPIST');
    expect(wrapper.find('#prontuario').exists()).toBe(true);
    expect(wrapper.text()).toContain('Prontuário');
  });

  it('ADMIN nunca vê a seção de Prontuário nem seu conteúdo clínico', async () => {
    const wrapper = await renderPage('ADMIN');
    expect(wrapper.find('#prontuario').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Nota.');
  });
});

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const appt = (id: number, offset: number, status: string) => ({
  id, client: 1, professional: 1, service: null, package: null, starts_at: iso(offset),
  ends_at: new Date(new Date(iso(offset)).getTime() + 3_000_000).toISOString(),
  status, modality: 'ONLINE', call_link: '', price: null, notes: '', created_at: iso(-30),
});
const page = (data: unknown[]) => ({ data, pagination: { page: 1, per_page: 50, total: data.length, total_pages: 1 } });

function richFetch(patchStatus = 200) {
  return vi.fn((url: string, init?: RequestInit) => {
    const at = '2026-09-10T10:00:00Z';
    if (init?.method === 'PATCH') return Promise.resolve(new Response(JSON.stringify({ detail: 'x' }), { status: patchStatus }));
    if (url.includes('/clinical-records')) {
      return Promise.resolve(json(page([{ id: 1, client: 1, professional: 1, recordedAt: at, createdAt: at,
        content: JSON.stringify({ evolucao: 'Paciente mais calmo.', pontosImportantes: '', anotacoesCorriqueiras: '', pontosAtencao: 'Sono irregular.' }) }])));
    }
    if (url.includes('/packages')) {
      return Promise.resolve(json(page([{ id: 5, client: 1, name: 'Plano 8 sessões', total_sessions: 8, total_value: '1200.00', status: 'ACTIVE',
        start_date: '2026-09-01', used_sessions: 5, remaining_sessions: 3 }])));
    }
    if (url.includes('/appointments')) return Promise.resolve(json(page([appt(1, 2, 'CONFIRMED'), appt(2, -3, 'COMPLETED'), appt(3, 4, 'CANCELLED')])));
    if (url.includes('/services')) return Promise.resolve(json(page([])));
    if (url.includes('/clients/1')) {
      return Promise.resolve(json({ data: { id: 1, name: 'Maria Souza', email: 'maria@x.com', phone: '(11) 98888-1111', birthDate: '1991-09-15', createdAt: at } }));
    }
    return Promise.resolve(json({ data: {} }));
  });
}

async function renderRich(role: 'ADMIN' | 'THERAPIST', fetchMock = richFetch()) {
  setActivePinia(createPinia());
  useAuthStore().mockLogin(role);
  vi.stubGlobal('fetch', fetchMock);
  const router = buildRouter();
  router.push('/clientes/1');
  await router.isReady();
  const wrapper = mount(ClienteDetailPage, { global: { plugins: [router] }, props: { id: '1' } });
  await flushPromises();
  return wrapper;
}

describe('ClienteDetailPage — layout da área do cliente', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useToast().toasts.forEach((t) => useToast().dismiss(t.id));
  });

  it('cabeçalho traz iniciais e contatos; resumo mostra sessões realizadas e pacote ativo', async () => {
    const wrapper = await renderRich('THERAPIST');
    expect(wrapper.find('header').text()).toContain('MS');
    expect(wrapper.find('a[href^="tel:"]').text()).toContain('(11) 98888-1111');
    expect(wrapper.find('a[href="mailto:maria@x.com"]').exists()).toBe(true);
    const summary = wrapper.find('dl').text();
    expect(summary).toContain('3 de 8 restantes');
    expect(summary).toContain('Plano 8 sessões');
    expect(summary).toContain('1'); // uma sessão concluída
  });

  it('a consulta cancelada no futuro não vira "próxima": vai pro histórico da aba Consultas', async () => {
    const wrapper = await renderRich('THERAPIST');
    const overview = wrapper.find('#panel-geral');
    expect(overview.findAll('li')).toHaveLength(1);
    await wrapper.find('#tab-consultas').trigger('click');
    const history = wrapper.find('#panel-consultas');
    expect(history.text()).toContain('Cancelado');
    expect(history.text()).toContain('Concluído');
    expect(wrapper.find('#tab-consultas').attributes('aria-selected')).toBe('true');
  });

  it('prontuário aparece em blocos rotulados, com pontos de atenção destacados', async () => {
    const wrapper = await renderRich('THERAPIST');
    await wrapper.find('#tab-prontuario').trigger('click');
    const panel = wrapper.find('#prontuario');
    expect(panel.text()).toContain('Evolução da sessão');
    expect(panel.text()).toContain('Paciente mais calmo.');
    expect(panel.text()).toContain('Sono irregular.');
    expect(panel.text()).not.toContain('Pontos importantes'); // bloco vazio não aparece
    expect(panel.find('.border-warning').text()).toContain('Sono irregular.');
  });

  it('ADMIN não tem a aba de Prontuário', async () => {
    const wrapper = await renderRich('ADMIN');
    expect(wrapper.find('#tab-prontuario').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Paciente mais calmo.');
  });

  it('falha ao salvar os dados vira toast, não texto na tela', async () => {
    const wrapper = await renderRich('THERAPIST', richFetch(500));
    await wrapper.findAll('button').find((b) => b.text() === 'Editar')!.trigger('click');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(useToast().toasts.some((t) => t.kind === 'error')).toBe(true);
    expect(wrapper.find('#panel-geral').text()).not.toContain('Não foi possível');
  });
});

