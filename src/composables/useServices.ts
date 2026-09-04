import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewService, Service } from '@/types/service';

export function useServices() {
  const services = ref<Service[]>([]);
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
      const res = await backApi<PaginatedEnvelope<Service>>('/api/v1/services?per_page=100');
      services.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar os serviços. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function create(service: NewService) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Service>>('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify(service),
      });
      services.value.push(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o serviço. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: string, patch: NewService) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Service>>(`/api/v1/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const index = services.value.findIndex((s) => s.id === id);
      if (index !== -1) services.value[index] = res.data;
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o serviço. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/services/${id}`, { method: 'DELETE' });
      services.value = services.value.filter((s) => s.id !== id);
    } catch {
      saveError.value = 'Não foi possível excluir o serviço. Tente novamente.';
    } finally {
      removingId.value = null;
    }
  }

  return { services, loading, showLoading, error, saving, saveError, removingId, load, create, update, remove };
}
