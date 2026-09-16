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
