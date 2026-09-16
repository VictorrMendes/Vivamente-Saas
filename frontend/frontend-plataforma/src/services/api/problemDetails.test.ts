import { describe, expect, it } from 'vitest';
import { parseErrorMessage } from './problemDetails';

describe('parseErrorMessage', () => {
  it('prioriza o campo detail (RFC 9457)', () => {
    expect(parseErrorMessage({ detail: 'Detalhe', title: 'Título', message: 'Msg' }, 'fallback')).toBe('Detalhe');
  });

  it('usa title quando não há detail', () => {
    expect(parseErrorMessage({ title: 'Título', message: 'Msg' }, 'fallback')).toBe('Título');
  });

  it('usa message quando não há detail nem title (formato legado)', () => {
    expect(parseErrorMessage({ message: 'Msg' }, 'fallback')).toBe('Msg');
  });

  it('cai no fallback quando o corpo não tem nenhum desses campos', () => {
    expect(parseErrorMessage({}, 'fallback')).toBe('fallback');
    expect(parseErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(parseErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
