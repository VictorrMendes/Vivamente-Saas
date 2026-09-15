import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import FinanceiroPage from './FinanceiroPage.vue';
import { useAuthStore } from '@/stores/auth';

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/financeiro', name: 'financeiro', component: FinanceiroPage }],
  });
}

const json = (body: unknown) => new Response(JSON.stringify(body));
const now = '2026-09-10T10:00:00Z';

function stubFetch(balanceCalls: { count: number }) {
  return vi.fn((url: string, init?: RequestInit) => {
    if (url.includes('/payments/balance')) {
      balanceCalls.count += 1;
      return Promise.resolve(
        json({ data: { month: '2026-09', receivedTotal: '0.00', receivedCount: 0, pendingTotal: '150.00', pendingCount: 1, sessionsCount: 1 } }),
      );
    }
    if (url.includes('/payments/1') && init?.method === 'PATCH') {
      return Promise.resolve(
        json({ data: { id: 1, client: 1, amount: 150, dueDate: '2026-09-20', status: 'PAID', receiptNumber: 'REC-000001', paidAt: now } }),
      );
    }
    if (url.includes('/payments')) {
      return Promise.resolve(
        json({
          data: [{ id: 1, client: 1, amount: 150, dueDate: '2026-09-20', status: 'PENDING', receiptNumber: 'REC-000001' }],
          pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 },
        }),
      );
    }
    if (url.includes('/clients')) {
      return Promise.resolve(
        json({ data: [{ id: 1, name: 'Maria Souza', email: 'maria@x.com', phone: 'x', createdAt: now }], pagination: { page: 1, per_page: 100, total: 1, total_pages: 1 } }),
      );
    }
    return Promise.resolve(json({ data: {} }));
  });
}

describe('FinanceiroPage — resumo do mês atualiza após alterações nos pagamentos', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('recarrega o saldo mensal depois de marcar um pagamento como pago', async () => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
    const balanceCalls = { count: 0 };
    vi.stubGlobal('fetch', stubFetch(balanceCalls));
    const router = buildRouter();
    router.push('/financeiro');
    await router.isReady();
    const wrapper = mount(FinanceiroPage, { global: { plugins: [router] } });
    await flushPromises();

    expect(balanceCalls.count).toBe(1);

    const payButton = wrapper.findAll('button').find((b) => b.text() === 'Marcar como pago');
    await payButton!.trigger('click');
    await flushPromises();

    expect(balanceCalls.count).toBe(2);
  });
});
