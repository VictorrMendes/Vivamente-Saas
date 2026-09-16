import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppointmentForm from './AppointmentForm.vue';
import type { Appointment } from '@/types/appointment';
import type { Client } from '@/types/client';
import type { Package } from '@/types/package';
import type { Professional } from '@/types/professional';

const clients: Client[] = [
  { id: 1, name: 'Maria Souza', email: 'maria@x.com', phone: '119', createdAt: 'x' },
  { id: 2, name: 'Carlos Lima', email: 'carlos@x.com', phone: '119', createdAt: 'x' },
];
const packages: Package[] = [
  { id: 10, client: 1, name: 'Pacote da Maria', totalSessions: 4, totalValue: 100, status: 'ACTIVE', startDate: '2026-01-01', usedSessions: 0, remainingSessions: 4 },
  { id: 20, client: 2, name: 'Pacote do Carlos', totalSessions: 4, totalValue: 100, status: 'ACTIVE', startDate: '2026-01-01', usedSessions: 0, remainingSessions: 4 },
];
const professionals: Professional[] = [
  { id: 1, user: 1, slug: 'ana', fullName: 'Ana Paula', bio: '', isPublic: true, specialtyIds: [] },
];

function mountForm(overrides: Record<string, unknown> = {}) {
  return mount(AppointmentForm, {
    props: { clients, services: [], packages, role: 'THERAPIST', saving: false, saveError: null, ...overrides },
  });
}

describe('AppointmentForm — acessibilidade, validação e pacote por cliente', () => {
  it('cada campo tem label associado por id (a11y)', () => {
    const wrapper = mountForm();
    for (const label of wrapper.findAll('label')) {
      const forAttr = label.attributes('for');
      expect(forAttr, `label "${label.text()}" sem for=`).toBeTruthy();
      expect(wrapper.find(`#${forAttr}`).exists(), `nenhum campo com id="${forAttr}"`).toBe(true);
    }
  });

  it('limpa o pacote selecionado ao trocar de cliente e só oferece pacotes elegíveis', async () => {
    const wrapper = mountForm();
    const [clientSelect, , packageSelect] = wrapper.findAll('select');

    await clientSelect!.setValue('1');
    await packageSelect!.setValue('10');
    expect((packageSelect!.element as HTMLSelectElement).value).toBe('10');

    // troca pro cliente 2 — o pacote 10 (da Maria) não é mais elegível, deve ser limpo.
    await clientSelect!.setValue('2');
    expect((packageSelect!.element as HTMLSelectElement).value).toBe('');
    const options = packageSelect!.findAll('option').map((o) => o.element.value);
    expect(options).not.toContain('10');
    expect(options).toContain('20');
  });

  it('não emite submit e mostra erro quando nenhum cliente é selecionado', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Selecione um cliente.');
  });

  it('rejeita horário final antes ou igual ao inicial', async () => {
    const wrapper = mountForm();
    const [clientSelect] = wrapper.findAll('select');
    await clientSelect!.setValue('1');
    const [dateInput, startInput, endInput] = wrapper.findAll('input[type=date], input[type=time]');
    await dateInput!.setValue('2026-10-10');
    await startInput!.setValue('10:00');
    await endInput!.setValue('09:00');
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('O horário final precisa ser depois do inicial.');
  });

  it('ADMIN criando consulta precisa informar o profissional (exigido pelo Back)', async () => {
    const wrapper = mountForm({ role: 'ADMIN', professionals });
    const [clientSelect] = wrapper.findAll('select');
    await clientSelect!.setValue('1');
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Selecione o profissional.');

    const selects = wrapper.findAll('select');
    const profSelect = selects.find((s) => s.findAll('option').some((o) => o.text() === 'Ana Paula'));
    await profSelect!.setValue('1');
    await wrapper.find('form').trigger('submit.prevent');
    const emitted = wrapper.emitted('submit');
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toMatchObject({ professional: 1 });
  });

  it('THERAPIST não vê nem envia o campo profissional (o Back resolve sozinho)', async () => {
    const wrapper = mountForm({ role: 'THERAPIST' });
    expect(wrapper.text()).not.toContain('Profissional');
    const [clientSelect] = wrapper.findAll('select');
    await clientSelect!.setValue('1');
    await wrapper.find('form').trigger('submit.prevent');
    const emitted = wrapper.emitted('submit');
    expect(emitted![0]![0]).not.toHaveProperty('professional');
  });

  it('envia preço zero e observações/link limpos de verdade, sem mascarar como undefined', async () => {
    const initial: Appointment = {
      id: 5,
      client: 1,
      startsAt: '2026-10-10T13:00:00.000Z',
      endsAt: '2026-10-10T14:00:00.000Z',
      status: 'PENDING',
      modality: 'ONLINE',
      callLink: 'https://old.example.com',
      price: 150,
      notes: 'Nota antiga',
    };
    const wrapper = mountForm({ initial });
    const priceInput = wrapper.find('input[type=number]');
    await priceInput.setValue('0');
    const callLinkInput = wrapper.find('input[type=url]');
    await callLinkInput.setValue('');
    const notesTextarea = wrapper.find('textarea');
    await notesTextarea.setValue('');

    await wrapper.find('form').trigger('submit.prevent');
    const emitted = wrapper.emitted('submit')![0]![0] as Record<string, unknown>;
    expect(emitted.price).toBe(0);
    expect(emitted.callLink).toBe('');
    expect(emitted.notes).toBe('');
  });

  it('edição sem trocar o pacote não reenvia a chave `package` (evita revalidar contra pacote já esgotado)', async () => {
    const initial: Appointment = {
      id: 6,
      client: 1,
      package: 10,
      startsAt: '2026-10-10T13:00:00.000Z',
      endsAt: '2026-10-10T14:00:00.000Z',
      status: 'PENDING',
      modality: 'IN_PERSON',
      price: 150,
    };
    const wrapper = mountForm({ initial });
    await wrapper.find('form').trigger('submit.prevent');
    const emitted = wrapper.emitted('submit')![0]![0] as Record<string, unknown>;
    expect(emitted).not.toHaveProperty('package');
  });

  it('edição que troca o pacote reenvia a chave `package` com o novo valor', async () => {
    const initial: Appointment = {
      id: 7,
      client: 1,
      package: 10,
      startsAt: '2026-10-10T13:00:00.000Z',
      endsAt: '2026-10-10T14:00:00.000Z',
      status: 'PENDING',
      modality: 'IN_PERSON',
      price: 150,
    };
    const wrapper = mountForm({ initial });
    const selects = wrapper.findAll('select');
    const packageSelect = selects[selects.length - 2]!; // client, service, package, modality
    await packageSelect.setValue('');
    await wrapper.find('form').trigger('submit.prevent');
    const emitted = wrapper.emitted('submit')![0]![0] as Record<string, unknown>;
    expect(emitted.package).toBeNull();
  });
});
