import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { usePayments } from './usePayments';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('usePayments — status e saldo mensal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('cria um pagamento e recebe receipt_number gerado pelo servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 1, client: 1, amount: '150.00', dueDate: '2026-10-01', status: 'PENDING', receiptNumber: 'REC-000001' } }, 201),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { payments, create } = usePayments();
    const ok = await create({ client: 1, amount: 150, dueDate: '2026-10-01' });

    expect(ok).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string).amount).toBe('150.00');
    expect(payments.value[0]).toMatchObject({ amount: 150, receiptNumber: 'REC-000001' });
  });

  it('marca como pago via PATCH {status} com o id numérico', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 4, client: 1, amount: 150, dueDate: '2026-10-01', status: 'PAID', receiptNumber: 'REC-000004', paidAt: '2026-10-01T10:00:00Z' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { updateStatus, payments } = usePayments();
    payments.value = [{ id: 4, client: 1, amount: 150, dueDate: '2026-10-01', status: 'PENDING', receiptNumber: 'REC-000004' }];
    const ok = await updateStatus(4, 'PAID');

    expect(ok).toBe(true);
    expect(payments.value[0]!.status).toBe('PAID');
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/payments/4');
    expect(JSON.parse(options.body as string)).toEqual({ status: 'PAID' });
  });

  it('carrega o saldo mensal e converte received_total/pending_total pra number', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { month: '2026-09', receivedTotal: '430.00', receivedCount: 2, pendingTotal: '250.00', pendingCount: 1, sessionsCount: 3 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { balance, loadBalance } = usePayments();
    await loadBalance('2026-09');

    expect(fetchMock.mock.calls[0]![0]).toContain('/payments/balance?month=2026-09');
    expect(balance.value).toEqual({ month: '2026-09', receivedTotal: 430, receivedCount: 2, pendingTotal: 250, pendingCount: 1, sessionsCount: 3 });
  });

  it('pagina e filtra por client/status — suportados pelo filterset_fields real do PaymentViewSet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [], pagination: { page: 3, per_page: 10, total: 0, total_pages: 5 } }));
    vi.stubGlobal('fetch', fetchMock);

    const { pagination, load } = usePayments();
    await load({ page: 3, client: 9, status: 'PENDING' });

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('page=3');
    expect(url).toContain('client=9');
    expect(url).toContain('status=PENDING');
    expect(pagination.value).toEqual({ page: 3, per_page: 10, total: 0, total_pages: 5 });
  });
});
