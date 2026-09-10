import { describe, expect, it } from 'vitest';
import { deepCamelCase, deepSnakeCase } from './caseConvert';

describe('deepSnakeCase', () => {
  it('converte chaves camelCase pra snake_case recursivamente', () => {
    expect(deepSnakeCase({ fullName: 'Ana', photoUrl: 'x', address: { zipCode: '123' } })).toEqual({
      full_name: 'Ana',
      photo_url: 'x',
      address: { zip_code: '123' },
    });
  });

  it('converte objetos dentro de arrays', () => {
    expect(deepSnakeCase({ specialtyIds: [{ startsAt: 'a' }] })).toEqual({
      specialty_ids: [{ starts_at: 'a' }],
    });
  });

  it('não mexe em valores primitivos, null ou arrays de primitivos', () => {
    expect(deepSnakeCase({ total: 3, active: true, tags: ['a', 'b'], note: null })).toEqual({
      total: 3,
      active: true,
      tags: ['a', 'b'],
      note: null,
    });
  });
});

describe('deepCamelCase', () => {
  it('converte chaves snake_case pra camelCase recursivamente', () => {
    expect(deepCamelCase({ full_name: 'Ana', photo_url: 'x', address: { zip_code: '123' } })).toEqual({
      fullName: 'Ana',
      photoUrl: 'x',
      address: { zipCode: '123' },
    });
  });

  it('converte listas de itens (resposta paginada)', () => {
    expect(deepCamelCase([{ total_sessions: 10 }, { total_sessions: 5 }])).toEqual([
      { totalSessions: 10 },
      { totalSessions: 5 },
    ]);
  });

  it('é a inversa de deepSnakeCase pro mesmo objeto', () => {
    const original = { fullName: 'Ana', specialtyIds: ['1', '2'] };
    expect(deepCamelCase(deepSnakeCase(original))).toEqual(original);
  });
});
