import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { useToast().toasts.forEach((t) => useToast().dismiss(t.id)); vi.useRealTimers(); });

  it('mostra o erro e some sozinho', () => {
    const t = useToast();
    t.error('Cadastre o WhatsApp do cliente.');
    expect(t.toasts).toHaveLength(1);
    expect(t.toasts[0]!.kind).toBe('error');
    vi.advanceTimersByTime(9001);
    expect(t.toasts).toHaveLength(0);
  });

  it('não empilha a mesma mensagem repetida', () => {
    const t = useToast();
    t.error('igual'); t.error('igual');
    expect(t.toasts).toHaveLength(1);
  });

  it('limita a 4 avisos visíveis e permite fechar', () => {
    const t = useToast();
    ['a', 'b', 'c', 'd', 'e'].forEach((m) => t.info(m));
    expect(t.toasts).toHaveLength(4);
    t.dismiss(t.toasts[0]!.id);
    expect(t.toasts).toHaveLength(3);
  });
});
