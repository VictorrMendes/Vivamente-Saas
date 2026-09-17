import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useMe } from './useMe';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('useMe — perfil e encerramento de sessões', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('THERAPIST');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('carrega o usuário via GET /me (e-mail é identidade só leitura, gerenciada pelo Oauth)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 1, firebaseUid: 'uid-1', email: 'terapeuta@x.com', role: 'THERAPIST', active: true } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { me, load } = useMe();
    await load();

    expect(me.value?.email).toBe('terapeuta@x.com');
  });

  it('encerra todas as sessões via POST /oauth/v1/tokens/revoke', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { revoked: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const { revokeAllSessions } = useMe();
    const ok = await revokeAllSessions();

    expect(ok).toBe(true);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/oauth/v1/tokens/revoke');
    expect(options.method).toBe('POST');
  });
});
