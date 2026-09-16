import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { Client, NewClient } from '@/types/client';

interface ClientsQuery {
  page?: number;
  search?: string;
}

export function useClients() {
  const clients = ref<Client[]>([]);
  const pagination = ref<PaginatedEnvelope<Client>['pagination'] | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);

  async function load(params: ClientsQuery = {}) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: '10' });
    if (params.search) query.set('search', params.search);

    try {
      const res = await backApi<PaginatedEnvelope<Client>>(`/api/v1/clients?${query}`);
      clients.value = res.data;
      pagination.value = res.pagination;
    } catch {
      error.value = 'Não foi possível carregar os clientes. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function create(client: NewClient) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Client>>('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify(client),
      });
      return res.data.id;
    } catch {
      saveError.value = 'Não foi possível salvar o cliente. Confira os dados e tente novamente.';
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { clients, pagination, loading, showLoading, error, saving, saveError, load, create };
}
