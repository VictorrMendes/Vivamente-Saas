import { describe, expect, it } from 'vitest';
import { safeLoginRedirect } from './redirect';

describe('destino após login', () => {
  it('preserva rota local, query e fragmento', () => {
    expect(safeLoginRedirect('/agenda?dia=2026-09-05#lista')).toBe('/agenda?dia=2026-09-05#lista');
  });
  it.each([undefined, ['/agenda'], 'https://example.com', '//example.com', '/\\example.com',
    '/%2fexample.com', '/%5cexample.com', '/login?redirect=/login', '/%6cogin', '/%zz', '/\ninvalid'])
  ('descarta destino inseguro ou circular (%#)', (value) => {
    expect(safeLoginRedirect(value)).toBe('/dashboard');
  });
});
