import { describe, expect, it } from 'vitest';
import { mapOAuthSession } from './oauth';

const sessionDto = {
  idToken: 'test-token', refreshToken: 'test-refresh', expiresIn: 3600,
  user: { id: '1', email: 'test@example.com', role: 'THERAPIST' as const },
};

describe('mapper OAuth', () => {
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
    { data: { ...sessionDto, refreshToken: null } },
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
