import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { ClinicalRecord } from '@/types/clinicalRecord';

export function useClinicalRecords() {
  const records = ref<ClinicalRecord[]>([]);
  const pagination = ref<PaginatedEnvelope<ClinicalRecord>['pagination'] | null>(null);
  let activeClientId: number | null = null;
  let loadVersion = 0;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<number | null>(null);

  async function load(clientId: number, page = 1) {
    const version = ++loadVersion;
    if (activeClientId !== clientId) {
      records.value = [];
      pagination.value = null;
    }
    activeClientId = clientId;
    loading.value = true;
    error.value = null;
    try {
      const res = await backApi<PaginatedEnvelope<ClinicalRecord>>(`/api/v1/clinical-records?client=${clientId}&per_page=20&page=${page}`);
      if (version !== loadVersion) return;
      records.value = res.data;
      pagination.value = res.pagination;
    } catch {
      if (version === loadVersion) error.value = 'Não foi possível carregar o prontuário. Tente novamente em instantes.';
    } finally {
      if (version === loadVersion) loading.value = false;
    }
  }

  async function create(clientId: number, content: string, appointmentId?: number) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<ClinicalRecord>>('/api/v1/clinical-records', {
        method: 'POST',
        body: JSON.stringify({ client: clientId, content, appointment: appointmentId }),
      });
      if (activeClientId === clientId) await load(clientId);
      else if (activeClientId === null) records.value.unshift(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o registro. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, content: string) {
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

  async function remove(id: number) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/clinical-records/${id}`, { method: 'DELETE' });
      records.value = records.value.filter((r) => r.id !== id);
      if (activeClientId !== null) {
        const page = pagination.value?.page ?? 1;
        await load(activeClientId, records.value.length === 0 ? Math.max(1, page - 1) : page);
      }
    } catch {
      saveError.value = 'Não foi possível excluir o registro. Tente novamente.';
    } finally {
      removingId.value = null;
    }
  }

  return { records, pagination, loading, error, saving, saveError, removingId, load, create, update, remove };
}
