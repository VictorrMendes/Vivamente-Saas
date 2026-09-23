import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppointmentActions from './AppointmentActions.vue';
import type { Appointment } from '@/types/appointment';

const appt = (status: Appointment['status']) => ({ id: 1, status }) as Appointment;
const buttons = (w: ReturnType<typeof mount>) => w.findAll('button').map((b) => b.text());

describe('AppointmentActions — status, editar e iniciar consulta', () => {
  it('confirmada + terapeuta: tag de status, Editar e Iniciar consulta; confirmação só no menu', () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('CONFIRMED'), role: 'THERAPIST' } });
    expect(w.text()).toContain('Confirmado');
    expect(buttons(w)).toContain('Editar');
    expect(buttons(w)).toContain('Iniciar consulta');
    expect(buttons(w)).not.toContain('Solicitar confirmação');
    expect(buttons(w)).toContain('Cancelar consulta');
  });

  it('pendente: oferece solicitar confirmação (WhatsApp) e registro manual, sem iniciar consulta', () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('PENDING'), role: 'THERAPIST' } });
    expect(buttons(w)).toContain('Solicitar confirmação');
    expect(buttons(w)).toContain('Registrar confirmação manual');
    expect(buttons(w)).not.toContain('Iniciar consulta');
  });

  it('ADMIN nunca vê Iniciar consulta (prontuário é só do terapeuta)', () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('CONFIRMED'), role: 'ADMIN' } });
    expect(buttons(w)).not.toContain('Iniciar consulta');
  });

  it('em atendimento: Retomar consulta, sem Editar nem menu', () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('IN_PROGRESS'), role: 'THERAPIST' } });
    expect(buttons(w)).toContain('Retomar consulta');
    expect(buttons(w)).not.toContain('Editar');
    expect(w.find('details').exists()).toBe(false);
  });

  it('concluída: só a tag de status', () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('COMPLETED'), role: 'THERAPIST' } });
    expect(w.findAll('button')).toHaveLength(0);
  });

  it('confirmada pode voltar para pendente (paciente mudou de ideia)', async () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('CONFIRMED'), role: 'THERAPIST' } });
    await w.findAll('button').find((b) => b.text() === 'Voltar para pendente')!.trigger('click');
    expect(w.emitted('reopen')).toHaveLength(1);
  });

  it.each(['CANCELLED', 'DECLINED'] as const)('%s: reabrir como pendente ou confirmada; sem Editar/Cancelar', async (status) => {
    const w = mount(AppointmentActions, { props: { appointment: appt(status), role: 'THERAPIST' } });
    expect(buttons(w)).toEqual(['Reabrir como pendente', 'Reabrir como confirmada']);
    await w.findAll('button')[0]!.trigger('click');
    await w.findAll('button')[1]!.trigger('click');
    expect(w.emitted('reopen')).toHaveLength(1);
    expect(w.emitted('confirm')).toHaveLength(1);
  });

  it('emite requestConfirmation ao clicar no item do menu', async () => {
    const w = mount(AppointmentActions, { props: { appointment: appt('PENDING'), role: 'THERAPIST' } });
    await w.findAll('button').find((b) => b.text() === 'Solicitar confirmação')!.trigger('click');
    expect(w.emitted('requestConfirmation')).toHaveLength(1);
  });
});
