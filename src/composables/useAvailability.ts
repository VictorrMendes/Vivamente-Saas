import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { AvailabilitySlot, NewAvailabilitySlot } from '@/types/availability';

export function useAvailability() {
  const slots = ref<AvailabilitySlot[]>([]);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<PaginatedEnvelope<AvailabilitySlot>>('/api/v1/availability?per_page=100');
      slots.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar a disponibilidade. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function create(slot: NewAvailabilitySlot) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<AvailabilitySlot>>('/api/v1/availability', {
        method: 'POST',
        body: JSON.stringify(slot),
      });
      slots.value.push(res.data);
    } catch {
      saveError.value = 'Não foi possível salvar o horário. Tente novamente.';
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/availability/${id}`, { method: 'DELETE' });
      slots.value = slots.value.filter((slot) => slot.id !== id);
    } catch {
      saveError.value = 'Não foi possível remover o horário. Tente novamente.';
    } finally {
      removingId.value = null;
    }
  }

  return { slots, loading, showLoading, error, saving, saveError, removingId, load, create, remove };
}
