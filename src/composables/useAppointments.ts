import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Appointment, AppointmentAction, AppointmentStatus } from '@/types/appointment';
import { startOfMonth, endOfMonth } from '@/lib/datetime';

const STATUS_AFTER_ACTION: Record<AppointmentAction, AppointmentStatus> = {
  confirm: 'confirmed',
  cancel: 'cancelled',
  complete: 'completed',
};

export function useAppointments() {
  const appointments = ref<Appointment[]>([]);
  const loading = ref(false);
  // Loading só aparece após 300ms, pra não piscar em respostas rápidas (components.md).
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const pendingActionId = ref<string | null>(null);

  /**
   * Carrega uma janela fixa de 1 mês atrás até 2 meses à frente (a Calendar
   * do v-calendar 3.1.2 não expõe evento de troca de mês pra refetch sob
   * demanda). Upgrade: refazer por página visível se isso ficar curto.
   */
  async function load(today = new Date()) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    const params = new URLSearchParams({
      from: startOfMonth(from),
      to: endOfMonth(to),
      per_page: '100',
    });

    try {
      const res = await backApi<PaginatedEnvelope<Appointment>>(`/api/v1/appointments?${params}`);
      appointments.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar a agenda. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function updateStatus(id: string, action: AppointmentAction) {
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

  return { appointments, loading, showLoading, error, actionError, pendingActionId, load, updateStatus };
}
