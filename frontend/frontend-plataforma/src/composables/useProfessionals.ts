import { normalizeProfessional, type ProfessionalResponse } from '@/types/professional';
import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewProfessional, Professional } from '@/types/professional';

interface ProfessionalsQuery {
  page?: number;
  search?: string;
}

export function useProfessionals() {
  const professionals = ref<Professional[]>([]);
  const pagination = ref<PaginatedEnvelope<Professional>['pagination'] | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);

  async function load(params: ProfessionalsQuery = {}) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: '10' });
    if (params.search) query.set('search', params.search);

    try {
      const res = await backApi<PaginatedEnvelope<ProfessionalResponse>>(`/api/v1/professionals?${query}`);
      professionals.value = res.data.map(normalizeProfessional);
      pagination.value = res.pagination;
    } catch {
      error.value = 'Não foi possível carregar os profissionais. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function create(professional: NewProfessional) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<ProfessionalResponse>>('/api/v1/professionals', {
        method: 'POST',
        body: JSON.stringify(professional),
      });
      return res.data.id;
    } catch {
      saveError.value = 'Não foi possível salvar o profissional. Confira os dados e tente novamente.';
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { professionals, pagination, loading, showLoading, error, saving, saveError, load, create };
}
