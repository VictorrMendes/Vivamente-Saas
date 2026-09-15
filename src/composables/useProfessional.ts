import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { Professional, ProfessionalPatch } from '@/types/professional';
import type { Appointment } from '@/types/appointment';

// O Back serializa price como string decimal (ou null), igual em Services/Packages/Payments.
function parsePrice(appt: Appointment): Appointment {
  return { ...appt, price: appt.price != null ? Number(appt.price) : undefined };
}

export function useProfessional() {
  const professional = ref<Professional | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);

  const appointments = ref<Appointment[]>([]);
  const appointmentsLoading = ref(false);
  const appointmentsError = ref<string | null>(null);

  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const deleting = ref(false);
  const deleteError = ref<string | null>(null);

  async function load(id: number) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<ApiEnvelope<Professional>>(`/api/v1/professionals/${id}`);
      professional.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar este profissional. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function loadAppointments(id: number) {
    appointmentsLoading.value = true;
    appointmentsError.value = null;
    try {
      const res = await backApi<PaginatedEnvelope<Appointment>>(`/api/v1/appointments?professional=${id}&per_page=50`);
      appointments.value = res.data.map(parsePrice);
    } catch {
      appointmentsError.value = 'Não foi possível carregar os agendamentos deste profissional.';
    } finally {
      appointmentsLoading.value = false;
    }
  }

  async function update(id: number, patch: ProfessionalPatch) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Professional>>(`/api/v1/professionals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      professional.value = res.data;
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar as alterações. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: number) {
    deleteError.value = null;
    deleting.value = true;
    try {
      await backApi<void>(`/api/v1/professionals/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      deleteError.value = 'Não foi possível excluir este profissional. Tente novamente.';
      return false;
    } finally {
      deleting.value = false;
    }
  }

  return {
    professional,
    loading,
    showLoading,
    error,
    appointments,
    appointmentsLoading,
    appointmentsError,
    saving,
    saveError,
    deleting,
    deleteError,
    load,
    loadAppointments,
    update,
    remove,
  };
}
