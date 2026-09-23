import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useUserLookup } from './useUserLookup';

function pending() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}
const response = (email: string, status = 200) => new Response(JSON.stringify({ data: [{ id: 1, email, role: 'THERAPIST', active: true }] }), { status });

describe('busca de contas em paralelo', () => {
  beforeEach(() => { setActivePinia(createPinia()); useAuthStore().mockLogin('ADMIN'); });
  afterEach(() => vi.unstubAllGlobals());

  it.each([200, 503])('ignora resposta antiga HTTP %i depois do resultado mais recente', async (status) => {
    const first = pending();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(response('nova@x.com')));
    const lookup = useUserLookup();
    const old = lookup.search('antiga');
    await lookup.search('nova');
    first.resolve(response('antiga@x.com', status));
    await old;
    expect(lookup.results.value[0].email).toBe('nova@x.com');
    expect(lookup.error.value).toBeNull();
    expect(lookup.loading.value).toBe(false);
  });

  it('resultado antigo não libera loading de uma busca ainda pendente', async () => {
    const first = pending(); const second = pending();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
    const lookup = useUserLookup();
    const old = lookup.search('antiga'); const current = lookup.search('nova');
    first.resolve(response('antiga@x.com'));
    await old;
    expect(lookup.loading.value).toBe(true);
    expect(lookup.results.value).toEqual([]);
    second.resolve(response('nova@x.com'));
    await current;
    expect(lookup.results.value[0].email).toBe('nova@x.com');
  });

  it.each(['clear', 'debounce'])('invalida chamadas pendentes ao limpar/editar o campo (%s)', async (action) => {
    const first = pending();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(first.promise));
    const lookup = useUserLookup(); const old = lookup.search('antiga');
    if (action === 'clear') await lookup.search('');
    else lookup.invalidate();
    first.resolve(response('antiga@x.com'));
    await old;
    expect(lookup.results.value).toEqual([]);
    expect(lookup.error.value).toBeNull();
    expect(lookup.loading.value).toBe(false);
  });
});
