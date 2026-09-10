import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { ClinicalRecord } from '@/types/clinicalRecord';

export function useClinicalRecords() {
  const records = ref<ClinicalRecord[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<string | null>(null);

  async function load(clientId: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await backApi<PaginatedEnvelope<ClinicalRecord>>(`/api/v1/clinical-records?client=${clientId}&per_page=100`);
      records.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar o prontuário. Tente novamente em instantes.';
    } finally {
      loading.value = false;
    }
  }

  async function create(clientId: string, content: string) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<ClinicalRecord>>('/api/v1/clinical-records', {
        method: 'POST',
        body: JSON.stringify({ client: clientId, content }),
      });
      records.value.unshift(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o registro. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: string, content: string) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<ClinicalRecord>>(`/api/v1/clinical-records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
      const index = records.value.findIndex((r) => r.id === id);
      if (index !== -1) records.value[index] = res.data;
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o registro. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/clinical-records/${id}`, { method: 'DELETE' });
      records.value = records.value.filter((r) => r.id !== id);
    } catch {
      saveError.value = 'Não foi possível excluir o registro. Tente novamente.';
    } finally {
      removingId.value = null;
    }
  }

  return { records, loading, error, saving, saveError, removingId, load, create, update, remove };
}
