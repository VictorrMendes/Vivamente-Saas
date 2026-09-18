import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useInstitutionalRequests } from './useInstitutionalRequests';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function pendingResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('useInstitutionalRequests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['forward', 0], ['forward', 1], ['status', 0], ['status', 1],
  ] as const)('mantém cada linha ocupada em %s quando a operação %i termina primeiro', async (kind, finishedIndex) => {
    const pending = [pendingResponse(), pendingResponse()];
    const fetchMock = vi.fn()
      .mockReturnValueOnce(pending[0].promise)
      .mockReturnValueOnce(pending[1].promise);
    vi.stubGlobal('fetch', fetchMock);
    const queue = useInstitutionalRequests();
    const start = (id: number) => kind === 'forward' ? queue.forward(id, 5) : queue.setStatus(id, 'IN_PROGRESS');
    const operations = [start(1), start(2)];
    expect(queue.isRowBusy(1)).toBe(true);
    expect(queue.isRowBusy(2)).toBe(true);

    // Nem repetição nem outro tipo de ação pode concorrer na mesma linha.
    expect(await queue.forward(1, 5)).toBe(false);
    expect(await queue.setStatus(1, 'CLOSED')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const remainingIndex = 1 - finishedIndex;
    pending[finishedIndex].resolve(json({ data: { id: finishedIndex + 1 } }));
    expect(await operations[finishedIndex]).toBe(true);
    expect(queue.isRowBusy(finishedIndex + 1)).toBe(false);
    expect(queue.isRowBusy(remainingIndex + 1)).toBe(true);
    pending[remainingIndex].resolve(json({ data: { id: remainingIndex + 1 } }));
    expect(await operations[remainingIndex]).toBe(true);
    expect(queue.isRowBusy(remainingIndex + 1)).toBe(false);
  });

  it('falha libera apenas sua linha para tentar novamente enquanto outra ação continua', async () => {
    const failed = pendingResponse();
    const stillPending = pendingResponse();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(stillPending.promise)
      .mockResolvedValueOnce(json({ data: { id: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    const queue = useInstitutionalRequests();
    const first = queue.forward(1, 5);
    const second = queue.setStatus(2, 'CLOSED');
    failed.resolve(json({ detail: 'Falha temporária' }, 503));
    expect(await first).toBe(false);
    expect(queue.isRowBusy(1)).toBe(false);
    expect(queue.isRowBusy(2)).toBe(true);
    expect(await queue.forward(1, 5)).toBe(true);
    expect(queue.isRowBusy(2)).toBe(true);
    stillPending.resolve(json({ data: { id: 2 } }));
    expect(await second).toBe(true);
    expect(queue.isRowBusy(2)).toBe(false);
  });

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

  it('mudar status com sucesso atualiza o item com os dados confirmados pelo servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 1, kind: 'THERAPIST_INTEREST', name: 'Ana', email: 'a@x.com', phone: '', message: '', status: 'IN_PROGRESS', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requests, setStatus } = useInstitutionalRequests();
    requests.value = [{ id: 1, kind: 'THERAPIST_INTEREST', name: 'Ana', email: 'a@x.com', phone: '', message: '', status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' }];

    const ok = await setStatus(1, 'IN_PROGRESS');

    expect(ok).toBe(true);
    expect(requests.value[0].status).toBe('IN_PROGRESS');
  });

  it('falha ao mudar status expõe erro real, não fica silenciosa', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ detail: 'Não é possível mudar de CLOSED para IN_PROGRESS.' }, 400));
    vi.stubGlobal('fetch', fetchMock);

    const { setStatus, statusError } = useInstitutionalRequests();
    const ok = await setStatus(1, 'IN_PROGRESS');

    expect(ok).toBe(false);
    expect(statusError.value).toBe('Não é possível mudar de CLOSED para IN_PROGRESS.');
  });

  it('resposta atrasada de uma busca anterior não sobrescreve o resultado mais recente', async () => {
    let resolveFirst!: (value: Response) => void;
    const firstPending = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstPending)
      .mockResolvedValueOnce(
        json({ data: [{ id: 2, kind: 'PATIENT', name: 'Recente', email: 'r@x.com', phone: '', message: '', status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-02' }], pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { requests, load } = useInstitutionalRequests();
    const firstLoad = load({ search: 'antigo' });
    await load({ search: 'novo' });
    // A primeira busca só "chega" depois da segunda já ter atualizado a tela.
    resolveFirst(json({ data: [{ id: 1, kind: 'PATIENT', name: 'Antigo', email: 'a@x.com', phone: '', message: '', status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' }], pagination: { page: 1, per_page: 10, total: 1, total_pages: 1 } }));
    await firstLoad;

    expect(requests.value).toHaveLength(1);
    expect(requests.value[0].name).toBe('Recente');
  });

  describe('createAccessAccount', () => {
    function stubOnboardingFetch(opts: { createStatus?: number } = {}) {
      const { createStatus = 201 } = opts;
      return vi.fn((url: string) => {
        if (url.includes('/oauth/v1/users')) {
          return Promise.resolve(
            createStatus === 201
              ? json({ data: { id: 'uid-1', email: 'ana@x.com', role: 'THERAPIST', active: true } }, 201)
              : json({ detail: 'Ja existe uma conta com esse e-mail.' }, 502),
          );
        }
        if (url.includes('/oauth/v1/password/forgot')) {
          return Promise.resolve(json({ data: { sent: true } }));
        }
        if (url.includes('/status')) {
          return Promise.resolve(
            json({ data: { id: 1, kind: 'THERAPIST_INTEREST', name: 'Ana', email: 'ana@x.com', phone: '', message: '', status: 'IN_PROGRESS', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' } }),
          );
        }
        return Promise.resolve(json({ data: {} }));
      });
    }

    it('cria a conta, dispara e-mail de senha e marca a solicitação em acompanhamento', async () => {
      const fetchMock = stubOnboardingFetch();
      vi.stubGlobal('fetch', fetchMock);
      const queue = useInstitutionalRequests();
      queue.requests.value = [{ id: 1, kind: 'THERAPIST_INTEREST', name: 'Ana', email: 'ana@x.com', phone: '', message: '', status: 'NEW', forwardedTo: null, forwardedLead: null, forwardedAt: null, createdAt: '2026-01-01' }];

      const ok = await queue.createAccessAccount(1, 'ana@x.com');

      expect(ok).toBe(true);
      expect(queue.accountCreatedIds.value.has(1)).toBe(true);
      expect(queue.requests.value[0].status).toBe('IN_PROGRESS');
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/oauth/v1/users'))).toBe(true);
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/oauth/v1/password/forgot'))).toBe(true);
    });

    it('e-mail já cadastrado expõe a mensagem real do Oauth, sem marcar sucesso', async () => {
      const fetchMock = stubOnboardingFetch({ createStatus: 502 });
      vi.stubGlobal('fetch', fetchMock);
      const queue = useInstitutionalRequests();

      const ok = await queue.createAccessAccount(1, 'ana@x.com');

      expect(ok).toBe(false);
      expect(queue.accountCreatedIds.value.has(1)).toBe(false);
      expect(queue.accountError.value).toBe('Ja existe uma conta com esse e-mail.');
      expect(queue.isRowBusy(1)).toBe(false);
    });

    it('não deixa criar conta duas vezes na mesma linha enquanto a primeira está em voo', async () => {
      const pending = pendingResponse();
      const fetchMock = vi.fn().mockReturnValue(pending.promise);
      vi.stubGlobal('fetch', fetchMock);
      const queue = useInstitutionalRequests();

      const first = queue.createAccessAccount(1, 'ana@x.com');
      expect(queue.isRowBusy(1)).toBe(true);
      expect(await queue.createAccessAccount(1, 'ana@x.com')).toBe(false);

      pending.resolve(json({ data: { id: 'uid-1' } }, 201));
      await first;
    });
  });
});
