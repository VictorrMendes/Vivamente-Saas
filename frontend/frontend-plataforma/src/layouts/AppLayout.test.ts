import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppLayout from './AppLayout.vue';
import { useAuthStore } from '@/stores/auth';

// AppLayout não entra na tabela de rotas aqui - ele tem seu próprio
// <RouterView/> interno; se ele também fosse o componente da rota "/",
// esse <RouterView/> renderizaria AppLayout de novo (duplicando header e
// sidebar). Rota plana só pra dar um "current route" válido pro useRouter()
// dentro do AppLayout que a gente monta diretamente.
function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', name: 'dashboard', component: { template: '<div>dashboard</div>' } },
      { path: '/login', name: 'login', component: { template: '<div>login</div>' } },
    ],
  });
}

const json = (body: unknown) => new Response(JSON.stringify(body));

async function renderLayout() {
  const router = buildRouter();
  router.push('/dashboard');
  await router.isReady();
  const wrapper = mount(AppLayout, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

// Regressão: o cumprimento e o rodapé da sidebar mostravam o e-mail da
// conta ("Olá, camila.nogueira.rocha@...") mesmo pra um THERAPIST logado -
// o User da conta não tem campo de nome, só o Professional (via /professionals,
// que auto-escopa pro próprio registro do terapeuta autenticado).
describe('AppLayout — nome de exibição', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('THERAPIST: busca o Professional e mostra o nome completo, não o e-mail', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      json({ data: [{ id: 1, user: 1, slug: 'camila', fullName: 'Camila Nogueira Rocha', bio: '', isPublic: true, specialtyIds: [] }], pagination: { page: 1, per_page: 1, total: 1, total_pages: 1 } }),
    ));

    const wrapper = await renderLayout();

    expect(wrapper.text()).toContain('Olá, Camila Nogueira Rocha');
    expect(wrapper.text()).not.toContain('therapist@vivamente.dev');
    expect(wrapper.text()).toContain('Área do terapeuta');
    expect(wrapper.find('a[href="/minha-pagina"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/profissionais"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/institucional"]').exists()).toBe(false);
  });

  it('THERAPIST sem perfil carregado ainda: cai pro e-mail em vez de mostrar vazio', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const wrapper = await renderLayout();

    expect(wrapper.text()).toContain('Olá, therapist@vivamente.dev');
  });

  it('ADMIN: mostra o e-mail direto, sem tentar buscar Professional (não existe pra ADMIN)', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [], pagination: { page: 1, per_page: 1, total: 0, total_pages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    const wrapper = await renderLayout();

    expect(wrapper.text()).toContain('Olá, admin@vivamente.dev');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Área administrativa');
    expect(wrapper.find('a[href="/profissionais"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/institucional"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/minha-pagina"]').exists()).toBe(false);
  });

  it('encerra a sessão pelo cabeçalho fora de Configurações', async () => {
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.mockLogin('ADMIN');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const wrapper = await renderLayout();
    await wrapper.get('header button[aria-label="Sair da conta"]').trigger('click');
    await flushPromises();
    expect(auth.isAuthenticated).toBe(false);
    expect(wrapper.vm.$route.name).toBe('login');
    wrapper.unmount();
  });
});
