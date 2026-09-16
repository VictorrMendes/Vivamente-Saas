import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useAppointments } from './useAppointments';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useAppointments — criação, edição e IDs numéricos', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('cria uma consulta, converte price pra string decimal na rede e de volta pra number na resposta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 42, client: 1, startsAt: '2026-10-02T14:00:00Z', endsAt: '2026-10-02T14:50:00Z', status: 'PENDING', price: '150.00' } }, 201),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { appointments, create } = useAppointments();
    const ok = await create({ client: 1, startsAt: '2026-10-02T14:00:00Z', endsAt: '2026-10-02T14:50:00Z', price: 150 });

    expect(ok).toBe(true);
    const [, options] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(options.body as string).price).toBe('150.00');
    expect(appointments.value[0]!.price).toBe(150);
    expect(appointments.value[0]!.id).toBe(42);
  });

  it('surfaça a mensagem real do Back em conflito de horário (409/400 reformatado em detail)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: 'starts_at: Já existe um agendamento nesse horário para este profissional.' }, 400),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { create, saveError } = useAppointments();
    const ok = await create({ client: 1, startsAt: '2026-10-02T14:00:00Z', endsAt: '2026-10-02T14:50:00Z' });

    expect(ok).toBe(false);
    expect(saveError.value).toBe('starts_at: Já existe um agendamento nesse horário para este profissional.');
  });

  it('edita uma consulta existente usando o id numérico na URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { id: 7, client: 1, startsAt: 'a', endsAt: 'b', status: 'PENDING' } }));
    vi.stubGlobal('fetch', fetchMock);

    const { update } = useAppointments();
    await update(7, { notes: 'Reagendado.' });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/appointments/7');
  });

  it('confirma/cancela/conclui usando o id numérico na URL de ação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ data: {} })));
    const { updateStatus } = useAppointments();
    await updateStatus(9, 'confirm');
    expect(vi.mocked(fetch).mock.calls[0]![0]).toContain('/appointments/9/confirm');
  });

  it('carrega o mês exibido no calendário (from/to) com status/client na query e busca todas as páginas', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: [{ id: 1, client: 1, startsAt: 'a', endsAt: 'b', status: 'PENDING' }], pagination: { page: 1, per_page: 100, total: 2, total_pages: 2 } }))
      .mockResolvedValueOnce(json({ data: [{ id: 2, client: 1, startsAt: 'c', endsAt: 'd', status: 'PENDING' }], pagination: { page: 2, per_page: 100, total: 2, total_pages: 2 } }));
    vi.stubGlobal('fetch', fetchMock);

    const { appointments, load } = useAppointments();
    await load({ year: 2026, month: 9, status: 'PENDING', client: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = fetchMock.mock.calls[0]![0] as string;
    expect(firstUrl).toContain('from=2026-09-01');
    expect(firstUrl).toContain('to=2026-09-30');
    expect(firstUrl).toContain('status=PENDING');
    expect(firstUrl).toContain('client=1');
    expect(fetchMock.mock.calls[1]![0]).toContain('page=2');
    expect(appointments.value.map((a) => a.id)).toEqual([1, 2]);
  });
});
