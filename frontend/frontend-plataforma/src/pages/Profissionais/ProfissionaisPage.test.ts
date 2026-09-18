import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import ProfissionaisPage from './ProfissionaisPage.vue';
import { useAuthStore } from '@/stores/auth';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/profissionais', name: 'profissionais', component: ProfissionaisPage }],
  });
}

const json = (body: unknown) => new Response(JSON.stringify(body));
const emptyPage = { data: [], pagination: { page: 1, per_page: 10, total: 0, total_pages: 1 } };

function stubFetch(userSearchCalls: { count: number }) {
  return vi.fn((url: string) => {
    if (url.includes('/api/v1/users')) {
      userSearchCalls.count += 1;
      return Promise.resolve(
        json({
          data: [{ id: 42, email: 'ana@teste.com', role: 'THERAPIST', active: true }],
          pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 },
        }),
      );
    }
    if (url.includes('/api/v1/specialties')) return Promise.resolve(json(emptyPage));
    if (url.includes('/api/v1/professionals')) return Promise.resolve(json(emptyPage));
    return Promise.resolve(json({ data: {} }));
  });
}

async function renderPage(path = '/profissionais') {
  setActivePinia(createPinia());
  useAuthStore().mockLogin('ADMIN');
  const router = buildRouter();
  router.push(path);
  await router.isReady();
  const wrapper = mount(ProfissionaisPage, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('ProfissionaisPage — busca de conta por e-mail', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('busca e seleciona uma conta por e-mail, habilitando o botão de salvar', async () => {
    const calls = { count: 0 };
    vi.stubGlobal('fetch', stubFetch(calls));
    const wrapper = await renderPage();
    await wrapper.find('button').trigger('click'); // "+ Novo profissional"

    await wrapper.find('#prof-user-search').setValue('ana@teste.com');
    await vi.waitFor(() => expect(calls.count).toBeGreaterThan(0));
    await flushPromises();

    const candidate = wrapper.findAll('button').find((b) => b.text().includes('ana@teste.com'));
    expect(candidate).toBeTruthy();
    await candidate!.trigger('click');

    expect(wrapper.text()).toContain('Selecionado: ana@teste.com');
    const submit = wrapper.find('button[type="submit"]');
    expect(submit.attributes('disabled')).toBeUndefined();
  });

  it('pré-preenche e-mail/nome vindos da fila institucional via query string', async () => {
    const calls = { count: 0 };
    vi.stubGlobal('fetch', stubFetch(calls));
    const wrapper = await renderPage('/profissionais?email=ana@teste.com&fullName=Ana%20Terapeuta');

    expect((wrapper.find('#prof-user-search').element as HTMLInputElement).value).toBe('ana@teste.com');
    expect((wrapper.find('#prof-name').element as HTMLInputElement).value).toBe('Ana Terapeuta');
    await vi.waitFor(() => expect(calls.count).toBeGreaterThan(0));
  });
});
