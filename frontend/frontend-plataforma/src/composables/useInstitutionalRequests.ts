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
  const forwardingId = ref<number | null>(null);
  const forwardError = ref<string | null>(null);

  async function load(params: InstitutionalRequestsQuery = {}) {
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
      requests.value = res.data;
      pagination.value = res.pagination;
    } catch {
      error.value = 'Não foi possível carregar a fila institucional. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function forward(id: number, professionalId: number) {
    forwardError.value = null;
    forwardingId.value = id;
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
      forwardingId.value = null;
    }
  }

  async function setStatus(id: number, status: InstitutionalRequestStatus) {
    try {
      await backApi<void>(`/api/v1/institutional-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const index = requests.value.findIndex((r) => r.id === id);
      if (index !== -1) requests.value[index] = { ...requests.value[index], status };
      return true;
    } catch {
      return false;
    }
  }

  return { requests, pagination, loading, showLoading, error, forwardingId, forwardError, load, forward, setStatus };
}
