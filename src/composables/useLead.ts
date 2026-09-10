import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { Lead, LeadStatus } from '@/types/lead';

export function useLead() {
  const lead = ref<Lead | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const statusSaving = ref(false);
  const statusError = ref<string | null>(null);
  const converting = ref(false);
  const convertError = ref<string | null>(null);
  const deleting = ref(false);
  const deleteError = ref<string | null>(null);

  async function load(id: string) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<ApiEnvelope<Lead>>(`/api/v1/leads/${id}`);
      lead.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar este lead. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function updateStatus(id: string, status: LeadStatus) {
    statusError.value = null;
    statusSaving.value = true;
    try {
      await backApi<void>(`/api/v1/leads/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (lead.value) lead.value.status = status;
    } catch {
      statusError.value = 'Não foi possível atualizar o status. Tente novamente.';
    } finally {
      statusSaving.value = false;
    }
  }

  async function convert(id: string) {
    convertError.value = null;
    converting.value = true;
    try {
      // POST /leads/{id}/convert devolve o Client recém-criado (não um { clientId }).
      const res = await backApi<ApiEnvelope<{ id: string }>>(`/api/v1/leads/${id}/convert`, {
        method: 'POST',
      });
      if (lead.value) lead.value.status = 'CONVERTED';
      return res.data.id;
    } catch {
      convertError.value = 'Não foi possível converter este lead em cliente. Tente novamente.';
      return null;
    } finally {
      converting.value = false;
    }
  }

  async function remove(id: string) {
    deleteError.value = null;
    deleting.value = true;
    try {
      await backApi<void>(`/api/v1/leads/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      deleteError.value = 'Não foi possível excluir este lead. Tente novamente.';
      return false;
    } finally {
      deleting.value = false;
    }
  }

  return {
    lead,
    loading,
    showLoading,
    error,
    statusSaving,
    statusError,
    converting,
    convertError,
    deleting,
    deleteError,
    load,
    updateStatus,
    convert,
    remove,
  };
}
