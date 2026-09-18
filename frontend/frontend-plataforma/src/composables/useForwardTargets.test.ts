import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useForwardTargets } from './useForwardTargets';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const professional = (id: number) => ({
  id, user: id, slug: `terapeuta-${id}`, fullName: `Terapeuta ${id}`, bio: '', isPublic: true, specialtyIds: [],
});

describe('useForwardTargets', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('filtra por is_public e user__active (elegibilidade)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: [professional(1)], pagination: { page: 1, per_page: 100, total: 1, total_pages: 1 } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { professionals, load } = useForwardTargets();
    await load();

    expect(professionals.value).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain('is_public=true');
    expect(url).toContain('user__active=true');
  });

  it('busca todas as páginas, não só a primeira', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json({ data: [professional(1)], pagination: { page: 1, per_page: 100, total: 2, total_pages: 2 } }),
      )
      .mockResolvedValueOnce(
        json({ data: [professional(2)], pagination: { page: 2, per_page: 100, total: 2, total_pages: 2 } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { professionals, load } = useForwardTargets();
    await load();

    expect(professionals.value.map((p) => p.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falha de carregamento expõe erro (pra tela oferecer tentar de novo)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ detail: 'erro' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    const { professionals, error, load } = useForwardTargets();
    await load();

    expect(professionals.value).toHaveLength(0);
    expect(error.value).toBeTruthy();
  });
});
