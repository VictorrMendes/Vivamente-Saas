import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Professional } from '@/types/professional';

/**
 * Terapeutas elegíveis pra receber um encaminhamento institucional. Filtra
 * por is_public=true no servidor (mesmo filterset_fields do ProfessionalViewSet);
 * o Back ainda valida usuário ativo na hora do forward — este filtro é só
 * pra não oferecer opção óbvia errada no seletor.
 */
export function useForwardTargets() {
  const professionals = ref<Professional[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await backApi<PaginatedEnvelope<Professional>>('/api/v1/professionals?is_public=true&per_page=100');
      professionals.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar a lista de terapeutas.';
    } finally {
      loading.value = false;
    }
  }

  return { professionals, loading, error, load };
}
