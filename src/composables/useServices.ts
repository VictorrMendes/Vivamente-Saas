import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewService, Service } from '@/types/service';

// O Back serializa `price` como string decimal ("150.00") — convertemos pra
// number na entrada e de volta pra string só na saída, pro resto do app
// (inputs numéricos, formatCurrency) trabalhar normal.
function parsePrice(service: Service): Service {
  return { ...service, price: Number(service.price) };
}

function toWirePrice(service: NewService) {
  return { ...service, price: service.price.toFixed(2) };
}

export function useServices() {
  const services = ref<Service[]>([]);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<number | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<PaginatedEnvelope<Service>>('/api/v1/services?per_page=100');
      services.value = res.data.map(parsePrice);
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
        body: JSON.stringify(toWirePrice(service)),
      });
      services.value.push(parsePrice(res.data));
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o serviço. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, patch: NewService) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Service>>(`/api/v1/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toWirePrice(patch)),
      });
      const index = services.value.findIndex((s) => s.id === id);
      if (index !== -1) services.value[index] = parsePrice(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o serviço. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: number) {
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
