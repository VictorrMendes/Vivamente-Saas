import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useClientOptions } from './useClientOptions';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useClientOptions — seletores de cliente não truncam além da 1ª página', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('busca todas as páginas de clientes antes de expor a lista', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: [{ id: 1, name: 'Cliente 1', email: 'a@a.com', phone: 'x', createdAt: 'x' }], pagination: { page: 1, per_page: 100, total: 101, total_pages: 2 } }))
      .mockResolvedValueOnce(json({ data: [{ id: 2, name: 'Cliente 2', email: 'b@b.com', phone: 'x', createdAt: 'x' }], pagination: { page: 2, per_page: 100, total: 101, total_pages: 2 } }));
    vi.stubGlobal('fetch', fetchMock);

    const { clients, clientName, load } = useClientOptions();
    await load();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(clients.value.map((c) => c.id)).toEqual([1, 2]);
    expect(clientName.value(2)).toBe('Cliente 2');
  });
});
