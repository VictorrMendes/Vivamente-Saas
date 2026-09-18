import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type {
  InstitutionalRequest,
  InstitutionalRequestKind,
  InstitutionalRequestStatus,
} from '@/types/institutionalRequest';

interface InstitutionalRequestsQuery {
  page?: number;
  kind?: InstitutionalRequestKind;
  search?: string;
}

export function useInstitutionalRequests() {
  const requests = ref<InstitutionalRequest[]>([]);
  const pagination = ref<PaginatedEnvelope<InstitutionalRequest>['pagination'] | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const forwardingIds = ref(new Set<number>());
  const forwardError = ref<string | null>(null);
  const statusChangingIds = ref(new Set<number>());
  const statusError = ref<string | null>(null);

  function isRowBusy(id: number): boolean {
    return forwardingIds.value.has(id) || statusChangingIds.value.has(id);
  }

  // Uma busca/filtro/paginação nova invalida qualquer resposta de uma
  // chamada anterior ainda em voo — sem isso, uma resposta atrasada de um
  // filtro velho pode sobrescrever o resultado do filtro atual.
  let loadVersion = 0;

  async function load(params: InstitutionalRequestsQuery = {}) {
    const version = ++loadVersion;
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: '10' });
    if (params.kind) query.set('kind', params.kind);
    if (params.search) query.set('search', params.search);

    try {
      const res = await backApi<PaginatedEnvelope<InstitutionalRequest>>(`/api/v1/institutional-requests?${query}`);
      if (version !== loadVersion) return;
      requests.value = res.data;
      pagination.value = res.pagination;
    } catch {
      if (version === loadVersion) error.value = 'Não foi possível carregar a fila institucional. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      if (version === loadVersion) {
        loading.value = false;
        showLoading.value = false;
      }
    }
  }

  async function forward(id: number, professionalId: number) {
    if (isRowBusy(id)) return false;
    forwardError.value = null;
    forwardingIds.value.add(id);
    try {
      const res = await backApi<ApiEnvelope<InstitutionalRequest>>(`/api/v1/institutional-requests/${id}/forward`, {
        method: 'POST',
        body: JSON.stringify({ professional: professionalId }),
      });
      const index = requests.value.findIndex((r) => r.id === id);
      if (index !== -1) requests.value[index] = res.data;
      return true;
    } catch (err) {
      // Motivo real ("já encaminhado", "profissional inativo"...) é mais útil
      // aqui do que uma mensagem genérica — há mais de uma causa possível.
      forwardError.value = err instanceof ApiError ? err.message : 'Não foi possível encaminhar. Tente novamente.';
      return false;
    } finally {
      forwardingIds.value.delete(id);
    }
  }

  async function setStatus(id: number, status: InstitutionalRequestStatus) {
    if (isRowBusy(id)) return false;
    statusError.value = null;
    statusChangingIds.value.add(id);
    try {
      const res = await backApi<ApiEnvelope<InstitutionalRequest>>(`/api/v1/institutional-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const index = requests.value.findIndex((r) => r.id === id);
      if (index !== -1) requests.value[index] = res.data;
      return true;
    } catch (err) {
      statusError.value = err instanceof ApiError ? err.message : 'Não foi possível mudar o status. Tente novamente.';
      return false;
    } finally {
      statusChangingIds.value.delete(id);
    }
  }

  return {
    requests,
    pagination,
    loading,
    showLoading,
    error,
    forwardingIds,
    forwardError,
    statusChangingIds,
    statusError,
    isRowBusy,
    load,
    forward,
    setStatus,
  };
}
