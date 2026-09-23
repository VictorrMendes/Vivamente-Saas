import { describe, expect, it } from 'vitest';
import { displayClinicalContent, parseClinicalContent } from './clinicalContent';

describe('clinicalContent — 4 blocos do prontuário (padrão Psique)', () => {
  it('lê os 4 blocos de um JSON salvo', () => {
    const raw = JSON.stringify({ evolucao: 'e', pontosImportantes: 'p', anotacoesCorriqueiras: 'a', pontosAtencao: 't' });
    expect(parseClinicalContent(raw)).toEqual({ evolucao: 'e', pontosImportantes: 'p', anotacoesCorriqueiras: 'a', pontosAtencao: 't' });
  });

  it('nota antiga em texto puro continua legível na evolução', () => {
    expect(parseClinicalContent('texto antigo').evolucao).toBe('texto antigo');
  });

  it('JSON sem nenhum bloco conhecido é tratado como texto puro, não perdido', () => {
    expect(parseClinicalContent('{"x":1}').evolucao).toBe('{"x":1}');
  });

  it('exibição omite blocos vazios e rotula os preenchidos', () => {
    const raw = JSON.stringify({ evolucao: 'e', pontosAtencao: 't' });
    expect(displayClinicalContent(raw)).toBe('Evolução da sessão\ne\n\nPontos de atenção\nt');
  });
});
