import { normalizeProfessional, type ProfessionalResponse } from '@/types/professional';
import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Professional } from '@/types/professional';

/**
 * Terapeutas elegíveis pra receber um encaminhamento institucional.
 * `user__active=true` filtra no servidor (config/settings + filterset_fields
 * novo em ProfessionalViewSet) — opt-in, não muda o comportamento padrão de
 * `/api/v1/professionals` pras telas que precisam ver inativos também.
 * Busca todas as páginas (mesmo padrão de useProfessionalOptions/useClientOptions),
 * já que um `<select>` não pagina. O Back ainda valida na hora do forward -
 * este filtro só evita oferecer uma opção óbvia errada.
 */
export function useForwardTargets() {
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
        const res = await backApi<PaginatedEnvelope<ProfessionalResponse>>(
          `/api/v1/professionals?is_public=true&user__active=true&page=${page}&per_page=100`,
        );
        all.push(...res.data.map(normalizeProfessional));
        totalPages = res.pagination.total_pages;
        page += 1;
      } while (page <= totalPages);
      professionals.value = all;
    } catch {
      error.value = 'Não foi possível carregar a lista de terapeutas.';
    } finally {
      loading.value = false;
    }
  }

  return { professionals, loading, error, load };
}
