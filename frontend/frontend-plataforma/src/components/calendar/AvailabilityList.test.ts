import { describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import AvailabilityList from './AvailabilityList.vue';

const slot = (id: number, day: number, hour: number, isBlocked = false) => ({
  id, isBlocked,
  startsAt: new Date(2030, 0, day, hour, 0).toISOString(),
  endsAt: new Date(2030, 0, day, hour, 50).toISOString(),
});

describe('AvailabilityList — kanban por dia', () => {
  const slots = [slot(3, 11, 9), slot(1, 10, 14), slot(2, 10, 9), slot(4, 10, 16, true)];

  it('agrupa em uma coluna por dia, com horários em ordem e contagem livre/bloqueado', () => {
    const w = mount(AvailabilityList, { props: { slots, pendingId: null } });
    const columns = w.findAll('section');
    expect(columns).toHaveLength(2);
    expect(columns[0]!.text()).toContain('10/01');
    expect(columns[0]!.text()).toContain('2 livres · 1 bloqueado');
    expect(columns[0]!.findAll('li').map((li) => li.text().slice(0, 5))).toEqual(['09:00', '14:00', '16:00']);
    expect(columns[1]!.text()).toContain('1 livre');
  });

  it('bloquear/desbloquear e remover emitem o id certo', async () => {
    const w = mount(AvailabilityList, { props: { slots, pendingId: null } });
    await w.find('[aria-label="Bloquear horário"]').trigger('click');
    await w.find('[aria-label="Desbloquear horário"]').trigger('click');
    await w.find('[aria-label="Remover horário"]').trigger('click');
    expect(w.emitted('toggleBlock')).toEqual([[2, true], [4, false]]);
    expect(w.emitted('remove')).toEqual([[2]]);
  });

  it('desabilita só as ações do horário em andamento', () => {
    const w = mount(AvailabilityList, { props: { slots, pendingId: 2 } });
    const disabled = w.findAll('button').filter((b) => b.attributes('disabled') !== undefined);
    expect(disabled).toHaveLength(2);
  });

  it('sem horários mostra o estado vazio', () => {
    const w = mount(AvailabilityList, { props: { slots: [], pendingId: null } });
    expect(w.text()).toContain('Nenhum horário de disponibilidade cadastrado.');
  });

  describe('+ por dia (duração definida pelo terapeuta)', () => {
    const open = async (w: ReturnType<typeof mount>) => {
      await w.find('[aria-label="Adicionar horário em 10/01"]').trigger('click');
    };
    const times = (w: ReturnType<typeof mount>) => w.findAll('input[type="time"]').map((i) => (i.element as HTMLInputElement).value);

    it('sugere começar onde o último horário do dia termina, com a mesma duração dele', async () => {
      const w = mount(AvailabilityList, { props: { slots, pendingId: null, submitSlot: vi.fn() } });
      await open(w);
      expect(times(w)).toEqual(['16:50', '17:40']);
    });

    it('aceita qualquer duração: atalho de 90 min e Fim editado à mão', async () => {
      const submit = vi.fn().mockResolvedValue(true);
      const w = mount(AvailabilityList, { props: { slots, pendingId: null, submitSlot: submit } });
      await open(w);
      await w.findAll('button').find((b) => b.text() === '90 min')!.trigger('click');
      expect(times(w)).toEqual(['16:50', '18:20']);
      await w.findAll('input[type="time"]')[1]!.setValue('19:05');
      await w.find('form').trigger('submit');
      await flushPromises();
      expect(submit).toHaveBeenCalledWith({ date: '2030-01-10', startTime: '16:50', endTime: '19:05' });
    });

    it('fecha o mini-formulário só quando salva; se falhar, continua aberto', async () => {
      const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const w = mount(AvailabilityList, { props: { slots, pendingId: null, submitSlot: submit } });
      await open(w);
      await w.find('form').trigger('submit');
      await flushPromises();
      expect(w.find('form').exists()).toBe(true);
      await w.find('form').trigger('submit');
      await flushPromises();
      expect(w.find('form').exists()).toBe(false);
    });

    it('não envia fim antes do início', async () => {
      const submit = vi.fn();
      const w = mount(AvailabilityList, { props: { slots, pendingId: null, submitSlot: submit } });
      await open(w);
      await w.findAll('input[type="time"]')[1]!.setValue('08:00');
      await w.find('form').trigger('submit');
      expect(submit).not.toHaveBeenCalled();
      expect(w.text()).toContain('O fim precisa ser depois do início.');
    });

    it('sem submitSlot não mostra o +', () => {
      const w = mount(AvailabilityList, { props: { slots, pendingId: null } });
      expect(w.find('[aria-label^="Adicionar horário"]').exists()).toBe(false);
    });
  });
});
