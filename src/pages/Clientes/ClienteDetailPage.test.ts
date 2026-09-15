import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ClienteDetailPage from './ClienteDetailPage.vue';
import { useAuthStore } from '@/stores/auth';

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
