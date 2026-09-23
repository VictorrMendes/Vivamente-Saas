import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import InstitucionalPage from './InstitucionalPage.vue';
import { useAuthStore } from '@/stores/auth';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/institucional', name: 'institucional', component: InstitucionalPage },
      { path: '/profissionais', name: 'profissionais', component: { template: '<div>profissionais</div>' } },
    ],
  });
}

const json = (body: unknown) => new Response(JSON.stringify(body));

// Regressão: uma solicitação CLOSED é estado terminal (services.py:
// VALID_STATUS_TRANSITIONS) — a fila não pode oferecer "encaminhar" para um
// paciente encerrado nem botões de ação para um interesse de terapeuta
// encerrado, só um indicador de que não há mais nada a fazer ali.
function stubFetch() {
  return vi.fn((url: string) => {
    if (url.includes('/institutional-requests')) {
      return Promise.resolve(
        json({
          data: [
            {
              id: 1, kind: 'PATIENT', name: 'Paciente Encerrado', email: 'p@x.com', phone: '', message: '',
              status: 'CLOSED', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-09-10T10:00:00Z',
            },
            {
              id: 2, kind: 'THERAPIST_INTEREST', name: 'Terapeuta Encerrado', email: 't@x.com', phone: '', message: '',
              status: 'CLOSED', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-09-10T10:00:00Z',
            },
          ],
          pagination: { page: 1, per_page: 10, total: 2, total_pages: 1 },
        }),
      );
    }
    if (url.includes('/professionals')) {
      return Promise.resolve(json({ data: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 1 } }));
    }
    return Promise.resolve(json({ data: {} }));
  });
}

describe('InstitucionalPage — estado encerrado (terminal) na fila', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('não oferece encaminhar para paciente encerrado, e mostra indicador em vez de botões', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    vi.stubGlobal('fetch', stubFetch());
    const router = buildRouter();
    router.push('/institucional');
    await router.isReady();
    const wrapper = mount(InstitucionalPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('Encerrado — sem encaminhamento.');
    expect(wrapper.find('select[id^="forward-"]').exists()).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text() === 'Encaminhar')).toBe(false);
  });

  it('não oferece botões de ação para interesse de terapeuta encerrado', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    vi.stubGlobal('fetch', stubFetch());
    const router = buildRouter();
    router.push('/institucional');
    await router.isReady();
    const wrapper = mount(InstitucionalPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain('Encerrado.');
    expect(wrapper.findAll('button').some((b) => b.text() === 'Encerrar')).toBe(false);
    expect(wrapper.findAll('button').some((b) => b.text() === 'Marcar em acompanhamento')).toBe(false);
  });
});

describe('InstitucionalPage — criar conta de acesso a partir de um interesse de terapeuta', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubOnboardingFetch(calls: { users: number; forgot: number; status: number }, failFirstEmail = false) {
    return vi.fn((url: string) => {
      if (url.includes('/institutional-requests') && !url.includes('/status')) {
        return Promise.resolve(
          json({
            data: [{
              id: 7, kind: 'THERAPIST_INTEREST', name: 'Ana Terapeuta', email: 'ana@x.com', phone: '', message: '',
              status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-09-10T10:00:00Z',
            }],
            pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 },
          }),
        );
      }
      if (url.includes('/professionals')) {
        return Promise.resolve(json({ data: [], pagination: { page: 1, per_page: 100, total: 0, total_pages: 1 } }));
      }
      if (url.includes('/oauth/v1/users')) {
        calls.users += 1;
        return Promise.resolve(json({ data: { id: 'uid-1', email: 'ana@x.com', role: 'THERAPIST', active: true } }));
      }
      if (url.includes('/oauth/v1/password/forgot')) {
        calls.forgot += 1;
        if (failFirstEmail && calls.forgot === 1) return Promise.resolve(new Response('{}', { status: 503 }));
        return Promise.resolve(json({ data: { sent: true } }));
      }
      if (url.includes('/status')) {
        calls.status += 1;
        return Promise.resolve(json({
          data: { id: 7, kind: 'THERAPIST_INTEREST', name: 'Ana Terapeuta', email: 'ana@x.com', phone: '', message: '', status: 'IN_PROGRESS', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-09-10T10:00:00Z' },
        }));
      }
      if (url.includes('/api/v1/users?')) {
        return Promise.resolve(json({ data: [{ id: 42, email: 'ana@x.com', role: 'THERAPIST', active: true }], pagination: { total_pages: 1 } }));
      }
      return Promise.resolve(json({ data: {} }));
    });
  }

  it('cria a conta, envia e-mail de senha e mostra o link pra criar o perfil profissional', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    const calls = { users: 0, forgot: 0, status: 0 };
    vi.stubGlobal('fetch', stubOnboardingFetch(calls));
    const router = buildRouter();
    router.push('/institucional');
    await router.isReady();
    const wrapper = mount(InstitucionalPage, { global: { plugins: [router] } });
    await flushPromises();

    const button = wrapper.findAll('button').find((b) => b.text() === 'Criar conta de acesso');
    expect(button).toBeTruthy();
    await button!.trigger('click');
    await flushPromises();

    expect(calls.users).toBe(1);
    expect(calls.forgot).toBe(1);
    expect(calls.status).toBe(1);
    expect(wrapper.text()).toContain('Conta de acesso disponível');
    expect(wrapper.text()).toContain('Pedido de envio do e-mail de definição de senha aceito');
    const link = wrapper.find('a[href*="/profissionais"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toContain('email=ana%40x.com');
    expect(link.attributes('href')).toContain('fullName=Ana');
  });

  it('mostra falha de e-mail e permite reenviar sem recriar a conta', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    const calls = { users: 0, forgot: 0, status: 0 };
    vi.stubGlobal('fetch', stubOnboardingFetch(calls, true));
    const router = buildRouter();
    await router.push('/institucional');
    const wrapper = mount(InstitucionalPage, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Criar conta de acesso')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain('envio do e-mail não foi confirmado');
    expect(wrapper.text()).not.toContain('senha aceito');
    expect(wrapper.find('a[href*="/profissionais"]').exists()).toBe(true);
    await wrapper.findAll('button').find((b) => b.text() === 'Enviar e-mail de acesso')!.trigger('click');
    await flushPromises();
    expect(calls).toEqual({ users: 1, forgot: 2, status: 1 });
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('senha aceito');
    wrapper.unmount();
  });

  it('retoma uma conta existente na tela sem criar outra nem prometer envio anterior', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
    const calls = { users: 0, forgot: 0, status: 0 };
    vi.stubGlobal('fetch', stubOnboardingFetch(calls));
    const router = buildRouter();
    await router.push('/institucional');
    const wrapper = mount(InstitucionalPage, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.findAll('button').find((b) => b.text() === 'Já tem conta? Retomar')!.trigger('click');
    await flushPromises();
    expect(calls).toEqual({ users: 0, forgot: 0, status: 1 });
    expect(wrapper.text()).toContain('Conta de acesso disponível');
    expect(wrapper.text()).not.toContain('senha aceito');
    expect(wrapper.find('a[href*="/profissionais"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
