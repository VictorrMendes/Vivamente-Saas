import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { Specialty } from '@/types/specialty';

/**
 * Qualquer autenticado lê; só ADMIN cria/edita/apaga (o Back garante isso —
 * aqui só refletimos o resultado, sem duplicar a checagem de role).
 */
export function useSpecialties() {
  const specialties = ref<Specialty[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await backApi<PaginatedEnvelope<Specialty>>('/api/v1/specialties?per_page=100');
      specialties.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar as especialidades. Tente novamente em instantes.';
    } finally {
      loading.value = false;
    }
  }

  async function create(name: string) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Specialty>>('/api/v1/specialties', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      specialties.value.push(res.data);
      return res.data;
    } catch {
      saveError.value = 'Não foi possível criar a especialidade. Tente novamente.';
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { specialties, loading, error, saving, saveError, load, create };
}
