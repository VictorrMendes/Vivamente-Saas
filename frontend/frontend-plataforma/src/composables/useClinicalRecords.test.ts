import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useClinicalRecords } from './useClinicalRecords';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useClinicalRecords — vínculo com consulta', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('carrega páginas posteriores sem misturar os registros', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: [{ id: 1, content: 'Primeira' }], pagination: { page: 1, total_pages: 6, total: 101, per_page: 20 } }))
      .mockResolvedValueOnce(json({ data: [{ id: 101, content: 'Última' }], pagination: { page: 6, total_pages: 6, total: 101, per_page: 20 } }));
    vi.stubGlobal('fetch', fetchMock);
    const state = useClinicalRecords();
    await state.load(1);
    await state.load(1, 6);
    expect(fetchMock.mock.calls[1]![0]).toContain('client=1&per_page=20&page=6');
    expect(state.records.value.map((r) => r.id)).toEqual([101]);
    expect(state.pagination.value?.page).toBe(6);
  });

  it('ignora resposta antiga após mudar de cliente', async () => {
    let resolveFirst!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(json({ data: [{ id: 2 }], pagination: { page: 1, total_pages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    const state = useClinicalRecords();
    const first = state.load(1);
    await state.load(2);
    resolveFirst(json({ data: [{ id: 1 }], pagination: { page: 1, total_pages: 1 } }));
    await first;
    expect(state.records.value.map((r) => r.id)).toEqual([2]);
  });

  it('volta para a página anterior ao excluir o último registro da página', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: [{ id: 21 }], pagination: { page: 2, total_pages: 2 } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ data: [{ id: 20 }], pagination: { page: 1, total_pages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    const state = useClinicalRecords();
    await state.load(1, 2);
    await state.remove(21);
    expect(fetchMock.mock.calls[2]![0]).toContain('page=1');
    expect(state.pagination.value?.page).toBe(1);
  });

  it('cria um registro vinculado a uma consulta específica', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 1, client: 1, professional: 1, appointment: 9, content: 'Evolução.', recordedAt: '2026-09-10T10:00:00Z', author: 1, createdAt: '2026-09-10T10:00:00Z' } }, 201),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { records, create } = useClinicalRecords();
    const ok = await create(1, 'Evolução.', 9);

    expect(ok).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toMatchObject({ client: 1, content: 'Evolução.', appointment: 9 });
    expect(records.value[0]).toMatchObject({ id: 1, appointment: 9 });
  });

  it('cria uma nota avulsa sem consulta associada (appointment fica undefined)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 2, client: 1, professional: 1, content: 'Nota avulsa.', recordedAt: '2026-09-10T10:00:00Z', author: 1, createdAt: '2026-09-10T10:00:00Z' } }, 201),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { create } = useClinicalRecords();
    await create(1, 'Nota avulsa.');

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string).appointment).toBeUndefined();
  });
});
