import { computed, ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Professional } from '@/types/professional';

/**
 * Lista completa de profissionais pra popular o seletor de ADMIN no
 * formulário de consultas — mesma lógica de useClientOptions (busca todas
 * as páginas, nunca trunca).
 */
export function useProfessionalOptions() {
  const professionals = ref<Professional[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const all: Professional[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await backApi<PaginatedEnvelope<Professional>>(`/api/v1/professionals?page=${page}&per_page=100`);
        all.push(...res.data);
        totalPages = res.pagination.total_pages;
        page += 1;
      } while (page <= totalPages);
      professionals.value = all;
    } catch {
      error.value = 'Não foi possível carregar a lista de profissionais.';
    } finally {
      loading.value = false;
    }
  }

  const professionalName = computed(() => {
    const map = new Map(professionals.value.map((p) => [p.id, p.fullName]));
    return (id: number) => map.get(id) ?? String(id);
  });

  return { professionals, loading, error, load, professionalName };
}
