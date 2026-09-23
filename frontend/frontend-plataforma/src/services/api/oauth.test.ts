import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapOAuthSession, mapOAuthRefresh, requestOAuthLogin, requestOAuthRefresh } from './oauth';

const sessionDto = {
  idToken: 'test-token', expiresIn: 3600,
  user: { id: '1', email: 'test@example.com', role: 'THERAPIST' as const },
};

describe('mapper OAuth — login', () => {
  it('desembrulha data, aceita meta e seleciona somente campos da sessão', () => {
    const result = mapOAuthSession({
      data: { ...sessionDto, internal: 'omit', user: { ...sessionDto.user, internal: 'omit' } },
      meta: { request_id: 'req-test', timestamp: '2026-09-05' },
    });
    expect(result).toEqual(sessionDto);
    expect(result.user).not.toBe(sessionDto.user);
  });

  it.each([
    undefined, null, {}, sessionDto, { data: null },
    { data: { ...sessionDto, idToken: '' } },
    { data: { ...sessionDto, expiresIn: 0 } },
    { data: { ...sessionDto, expiresIn: Infinity } },
    { data: { ...sessionDto, user: { ...sessionDto.user, role: 'UNKNOWN' } } },
  ])('rejeita respostas inválidas sem reter o payload (%#)', (body) => {
    expect(() => mapOAuthSession(body)).toThrow('Resposta de autenticação inválida');
    try { mapOAuthSession(body); } catch (error) {
      expect(error).toHaveProperty('body', undefined);
    }
  });
});

// Contrato real (backend/Oauth/apps/auth/serializers.py::RefreshResponseSerializer):
// o refresh só devolve idToken + expiresIn, nunca refreshToken nem user.
describe('mapper OAuth — refresh', () => {
  it('aceita o envelope mínimo do refresh (idToken + expiresIn, sem refreshToken/user)', () => {
    const result = mapOAuthRefresh({ data: { idToken: 'novo-token', expiresIn: 3600 } });
    expect(result).toEqual({ idToken: 'novo-token', expiresIn: 3600 });
  });

  it('ignora campos extras que o Back real não envia mais nessa resposta', () => {
    const result = mapOAuthRefresh({ data: { idToken: 'novo-token', expiresIn: 3600, refreshToken: 'nao-deveria-vir', user: {} } });
    expect(result).toEqual({ idToken: 'novo-token', expiresIn: 3600 });
  });

  it.each([
    undefined, null, {}, { data: null },
    { data: { idToken: '', expiresIn: 3600 } },
    { data: { idToken: 'tok', expiresIn: 0 } },
    { data: { expiresIn: 3600 } },
  ])('rejeita respostas de refresh inválidas (%#)', (body) => {
    expect(() => mapOAuthRefresh(body)).toThrow('Resposta de autenticação inválida');
  });
});

// O refresh token nunca passa por JS - vai/vem só via cookie httpOnly
// (Set-Cookie do Oauth). Sem credentials: 'include', o browser não manda
// nem aceita esse cookie em requisições cross-origin.
describe('requestOAuthLogin / requestOAuthRefresh — cookie httpOnly', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('login manda credentials: include', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { idToken: 'tok', expiresIn: 3600, user: { id: '1', email: 'a@a.com', role: 'ADMIN' } },
    })));
    vi.stubGlobal('fetch', fetchMock);

    await requestOAuthLogin({ email: 'a@a.com', senha: 'x' });

    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include');
  });

  it('refresh manda credentials: include e nenhum corpo (o cookie vai sozinho)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { idToken: 'tok', expiresIn: 3600 } })));
    vi.stubGlobal('fetch', fetchMock);

    await requestOAuthRefresh();

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.credentials).toBe('include');
    expect(init.body).toBeUndefined();
  });
});
