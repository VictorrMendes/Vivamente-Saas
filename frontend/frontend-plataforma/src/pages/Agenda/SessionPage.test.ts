import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import SessionPage from './SessionPage.vue';
import { useAuthStore } from '@/stores/auth';

const json = (body: unknown) => new Response(JSON.stringify(body));
const appointment = (status: string, extra = {}) => ({
  id: 5, client: 9, professional: 1, status, starts_at: '2030-01-10T14:00:00Z', ends_at: '2030-01-10T14:50:00Z',
  started_at: '2030-01-10T14:00:00Z', finished_at: null, ...extra,
});

function stub(status: string) {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url.includes('/clinical-records')) return Promise.resolve(json({ data: [], pagination: { page: 1, per_page: 1, total: 0, total_pages: 1 } }));
    if (url.includes('/clients/9')) return Promise.resolve(json({ data: { id: 9, name: 'Paciente Teste' } }));
    if (url.endsWith('/complete') && init?.method === 'PATCH') return Promise.resolve(json({ data: appointment('COMPLETED') }));
    return Promise.resolve(json({ data: appointment(status) }));
  });
}

async function render() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/agenda', component: { template: '<div/>' } }, { path: '/consultas/:id', component: SessionPage, props: true },
    { path: '/clientes/:id', component: { template: '<div/>' } },
  ] });
  router.push('/consultas/5');
  await router.isReady();
  const w = mount(SessionPage, { props: { id: '5' }, global: { plugins: [router] } });
  await flushPromises();
  return w;
}

describe('SessionPage — atendimento com cronômetro e prontuário', () => {
  beforeEach(() => { setActivePinia(createPinia()); useAuthStore().mockLogin('THERAPIST'); });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra paciente e os 4 blocos do prontuário; campos ativos só em atendimento', async () => {
    vi.stubGlobal('fetch', stub('IN_PROGRESS'));
    const w = await render();
    expect(w.text()).toContain('Paciente Teste');
    for (const label of ['Evolução da sessão', 'Pontos importantes', 'Anotações corriqueiras', 'Pontos de atenção']) expect(w.text()).toContain(label);
    expect(w.findAll('textarea').every((t) => !(t.element as HTMLTextAreaElement).disabled)).toBe(true);
    expect(w.text()).toContain('Salvar e concluir consulta');
  });

  it('consulta concluída: prontuário só leitura e sem botões de salvar', async () => {
    vi.stubGlobal('fetch', stub('COMPLETED'));
    const w = await render();
    expect(w.findAll('textarea').every((t) => (t.element as HTMLTextAreaElement).disabled)).toBe(true);
    expect(w.text()).not.toContain('Salvar e concluir consulta');
  });

  it('não conclui sem preencher a evolução (não chama /complete)', async () => {
    const fetchMock = stub('IN_PROGRESS');
    vi.stubGlobal('fetch', fetchMock);
    const w = await render();
    await w.findAll('button').find((b) => b.text() === 'Salvar e concluir consulta')!.trigger('click');
    await flushPromises();
    expect(w.text()).toContain('Preencha a evolução');
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/complete'))).toBe(false);
  });
});
