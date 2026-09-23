import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ConfirmationPage from './ConfirmationPage.vue';

const TOKEN = 'a'.repeat(43);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const preview = { startsAt: '2030-01-10T14:00:00Z', endsAt: '2030-01-10T14:50:00Z', professionalName: 'Camila Rocha', status: 'PENDING' };

describe('ConfirmationPage — paciente confirma pelo link (sem login)', () => {
  beforeEach(() => { setActivePinia(createPinia()); window.location.hash = `#token=${TOKEN}`; });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra o horário e envia o token no corpo (nunca na URL), sem Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { starts_at: preview.startsAt, ends_at: preview.endsAt, professional_name: 'Camila Rocha', status: 'PENDING' } }));
    vi.stubGlobal('fetch', fetchMock);
    const w = mount(ConfirmationPage);
    await flushPromises();

    expect(w.text()).toContain('Camila Rocha');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain(TOKEN);
    expect(JSON.parse(init.body)).toEqual({ token: TOKEN });
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('confirmar presença registra a resposta e troca os botões pela mensagem', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: { starts_at: preview.startsAt, ends_at: preview.endsAt, professional_name: 'Camila Rocha', status: 'PENDING' } }))
      .mockResolvedValueOnce(json({ data: { starts_at: preview.startsAt, ends_at: preview.endsAt, professional_name: 'Camila Rocha', status: 'CONFIRMED' } }));
    vi.stubGlobal('fetch', fetchMock);
    const w = mount(ConfirmationPage);
    await flushPromises();
    await w.findAll('button').find((b) => b.text() === 'Confirmar presença')!.trigger('click');
    await flushPromises();

    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ token: TOKEN, decision: 'confirm' });
    expect(w.text()).toContain('Presença confirmada');
    expect(w.findAll('button')).toHaveLength(0);
  });

  it('link inválido/expirado não expõe dado nenhum e orienta pedir novo link', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'expirou' }, 400)));
    const w = mount(ConfirmationPage);
    await flushPromises();
    expect(w.text()).toContain('Solicite um novo link');
    expect(w.findAll('button')).toHaveLength(0);
  });
});
