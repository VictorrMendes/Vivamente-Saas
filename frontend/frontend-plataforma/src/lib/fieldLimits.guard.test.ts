import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FieldCount from '@/components/ui/FieldCount.vue';

// Trava de regressão: todo campo de texto de tela precisa de maxlength (espelha o
// Back — ver lib/fieldLimits.ts). Sem isso o usuário digita além do limite e só
// descobre no erro do servidor.
const sources = import.meta.glob('../**/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const NON_TEXT = new Set(['checkbox', 'radio', 'date', 'time', 'file', 'hidden', 'number', 'datetime-local', 'month']);

describe('limites de caracteres nos formulários', () => {
  it('todo <input> de texto e <textarea> tem maxlength', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20); // glob vazio deixaria o teste passar à toa
    const offenders: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      for (const match of source.matchAll(/<(input|textarea)\b([\s\S]*?)\/?>/g)) {
        const attrs = match[2]!;
        const type = /\btype="([\w-]+)"/.exec(attrs)?.[1] ?? (match[1] === 'textarea' ? 'textarea' : 'text');
        if (NON_TEXT.has(type) || /\bdisabled\b/.test(attrs) || /maxlength/i.test(attrs)) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offenders.push(`${file}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('FieldCount', () => {
  it('mostra n/máx e avisa (aria-live) só perto do limite', () => {
    const far = mount(FieldCount, { props: { value: 'abc', max: 100 } });
    expect(far.text()).toBe('3/100');
    expect(far.attributes('aria-live')).toBe('off');
    const near = mount(FieldCount, { props: { value: 'x'.repeat(95), max: 100 } });
    expect(near.text()).toBe('95/100');
    expect(near.attributes('aria-live')).toBe('polite');
  });
});
