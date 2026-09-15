import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { usePackages } from './usePackages';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('usePackages — sessões restantes e edição de status', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('cria um pacote, converte totalValue pra string decimal e recebe usedSessions/remainingSessions computados do servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 5, client: 1, name: 'Pacote', totalSessions: 4, totalValue: '640.00', status: 'ACTIVE', startDate: '2026-08-01', usedSessions: 0, remainingSessions: 4 } }, 201),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { packages, create } = usePackages();
    const ok = await create({ client: 1, name: 'Pacote', totalSessions: 4, totalValue: 640, startDate: '2026-08-01' });

    expect(ok).toBe(true);
    // client.ts converte o corpo pra snake_case na rede (contrato real do Back).
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string).total_value).toBe('640.00');
    expect(packages.value[0]).toMatchObject({ id: 5, totalValue: 640, usedSessions: 0, remainingSessions: 4 });
  });

  it('atualiza o status do pacote (ex.: cancelar) via PATCH com o id numérico', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 3, client: 1, name: 'Pacote', totalSessions: 4, totalValue: 640, status: 'CANCELLED', startDate: '2026-08-01', usedSessions: 1, remainingSessions: 3 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { update } = usePackages();
    const ok = await update(3, { status: 'CANCELLED' });

    expect(ok).toBe(true);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/packages/3');
    expect(JSON.parse(options.body as string).status).toBe('CANCELLED');
  });

  it('pagina e filtra por client/status — suportados pelo filterset_fields real do PackageViewSet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: [], pagination: { page: 2, per_page: 10, total: 0, total_pages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    const { pagination, load } = usePackages();
    await load({ page: 2, client: 7, status: 'ACTIVE' });

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('client=7');
    expect(url).toContain('status=ACTIVE');
    expect(pagination.value).toEqual({ page: 2, per_page: 10, total: 0, total_pages: 1 });
  });
});
