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

  it('atualiza só o e-mail via PATCH /me (único campo aceito pelo UserUpdateSerializer real)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({ data: { id: 1, firebaseUid: 'uid-1', email: 'novo@x.com', role: 'THERAPIST', active: true } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { me, updateEmail } = useMe();
    const ok = await updateEmail('novo@x.com');

    expect(ok).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ email: 'novo@x.com' });
    expect(me.value?.email).toBe('novo@x.com');
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
