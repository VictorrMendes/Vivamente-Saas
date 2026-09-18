import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useInstitutionalRequests } from './useInstitutionalRequests';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useInstitutionalRequests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('carrega a fila e preenche pagination', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        data: [{ id: 1, kind: 'PATIENT', name: 'Joana', email: 'j@x.com', phone: '', message: '', status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' }],
        pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requests, pagination, load } = useInstitutionalRequests();
    await load();

    expect(requests.value).toHaveLength(1);
    expect(pagination.value?.total).toBe(1);
  });

  it('encaminhar com sucesso atualiza o item na lista', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        data: { id: 1, kind: 'PATIENT', name: 'Joana', email: 'j@x.com', phone: '', message: '', status: 'FORWARDED', forwardedTo: 5, forwardedLead: 9, forwardedAt: '2026-01-02', createdAt: '2026-01-01' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requests, forward } = useInstitutionalRequests();
    requests.value = [{ id: 1, kind: 'PATIENT', name: 'Joana', email: 'j@x.com', phone: '', message: '', status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' }];

    const ok = await forward(1, 5);

    expect(ok).toBe(true);
    expect(requests.value[0].status).toBe('FORWARDED');
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/institutional-requests/1/forward');
    expect(JSON.parse(options.body as string)).toEqual({ professional: 5 });
  });

  it('encaminhar repetido surge a mensagem real do Back, não uma genérica', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ detail: 'Esta solicitação já foi encaminhada.' }, 400),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { forward, forwardError } = useInstitutionalRequests();
    const ok = await forward(1, 5);

    expect(ok).toBe(false);
    expect(forwardError.value).toBe('Esta solicitação já foi encaminhada.');
  });
});
