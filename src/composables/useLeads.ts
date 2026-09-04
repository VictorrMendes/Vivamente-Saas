import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Lead, LeadStatus } from '@/types/lead';

interface LeadsQuery {
  page?: number;
  status?: LeadStatus;
  search?: string;
}

export function useLeads() {
  const leads = ref<Lead[]>([]);
  const pagination = ref<PaginatedEnvelope<Lead>['pagination'] | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);

  async function load(params: LeadsQuery = {}) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: '10' });
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    try {
      const res = await backApi<PaginatedEnvelope<Lead>>(`/api/v1/leads?${query}`);
      leads.value = res.data;
      pagination.value = res.pagination;
    } catch {
      error.value = 'Não foi possível carregar os leads. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  return { leads, pagination, loading, showLoading, error, load };
}
