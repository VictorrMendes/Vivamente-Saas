import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { Appointment, AppointmentAction, AppointmentPatch, AppointmentStatus, NewAppointment } from '@/types/appointment';
import { startOfMonth, endOfMonth } from '@/lib/datetime';

const STATUS_AFTER_ACTION: Record<AppointmentAction, AppointmentStatus> = {
  confirm: 'CONFIRMED',
  cancel: 'CANCELLED',
  complete: 'COMPLETED',
};

// O Back serializa price como string decimal (ou null), igual em Services/Packages/Payments.
function parsePrice(appt: Appointment): Appointment {
  return { ...appt, price: appt.price != null ? Number(appt.price) : undefined };
}

function toWirePrice<T extends { price?: number }>(input: T) {
  return { ...input, price: input.price != null ? input.price.toFixed(2) : undefined };
}

/**
 * O Back devolve o conflito de horário/pacote como ValidationError
 * (ex.: {"starts_at": "Já existe um agendamento..."}), reformatado pelo
 * handler RFC 9457 em `detail: "starts_at: <mensagem>"` — já legível o
 * bastante pra mostrar direto, sem inventar tradução própria.
 */
function appointmentErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

export interface AppointmentsQuery {
  /** Mês exibido no calendário (1-12) — refeito a cada troca de página do v-calendar. */
  year: number;
  month: number;
  /** status/client são suportados pelo filterset_fields real do Back — vão na query. */
  status?: AppointmentStatus;
  client?: number;
}

/** Busca todas as páginas do mês exibido — nunca descarta agendamentos silenciosamente além da 1ª página. */
async function fetchAppointmentsForMonth(params: AppointmentsQuery): Promise<Appointment[]> {
  const from = new Date(params.year, params.month - 1, 1);
  const to = new Date(params.year, params.month, 0);
  const query = new URLSearchParams({ from: startOfMonth(from), to: endOfMonth(to), per_page: '100' });
  if (params.status) query.set('status', params.status);
  if (params.client) query.set('client', String(params.client));

  const all: Appointment[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    query.set('page', String(page));
    const res = await backApi<PaginatedEnvelope<Appointment>>(`/api/v1/appointments?${query}`);
    all.push(...res.data.map(parsePrice));
    totalPages = res.pagination.total_pages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export function useAppointments() {
  const appointments = ref<Appointment[]>([]);
  const loading = ref(false);
  // Loading só aparece após 300ms, pra não piscar em respostas rápidas (components.md).
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const pendingActionId = ref<number | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);

  async function load(params: AppointmentsQuery) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      appointments.value = await fetchAppointmentsForMonth(params);
    } catch {
      error.value = 'Não foi possível carregar a agenda. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function updateStatus(id: number, action: AppointmentAction) {
    actionError.value = null;
    pendingActionId.value = id;
    try {
      await backApi<void>(`/api/v1/appointments/${id}/${action}`, { method: 'PATCH' });
      const target = appointments.value.find((a) => a.id === id);
      if (target) target.status = STATUS_AFTER_ACTION[action];
    } catch {
      actionError.value = 'Não foi possível atualizar o agendamento. Tente novamente.';
    } finally {
      pendingActionId.value = null;
    }
  }

  async function create(appt: NewAppointment) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Appointment>>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify(toWirePrice(appt)),
      });
      appointments.value.push(parsePrice(res.data));
      return true;
    } catch (err) {
      saveError.value = appointmentErrorMessage(err, 'Não foi possível criar o agendamento. Tente novamente.');
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: AppointmentPatch) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Appointment>>(`/api/v1/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toWirePrice(patch)),
      });
      const index = appointments.value.findIndex((a) => a.id === id);
      if (index !== -1) appointments.value[index] = parsePrice(res.data);
      return true;
    } catch (err) {
      saveError.value = appointmentErrorMessage(err, 'Não foi possível salvar o agendamento. Tente novamente.');
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { appointments, loading, showLoading, error, actionError, pendingActionId, saving, saveError, load, updateStatus, create, update };
}
