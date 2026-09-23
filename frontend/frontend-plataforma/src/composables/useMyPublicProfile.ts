import { normalizeProfessional, type ProfessionalResponse } from '@/types/professional';
import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { ApiEnvelope } from '@/types/api';
import type { Professional, PublicProfilePatch } from '@/types/professional';

export function useMyPublicProfile() {
  const profile = ref<Professional | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const saved = ref(false);

  async function load() {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      // O id do Professional é diferente do id do User (/me) — não dá pra
      // montar a URL direto. GET /professionals sem filtro já vem escopado
      // pro próprio registro quando quem chama é THERAPIST.
      const res = await backApi<PaginatedEnvelope<ProfessionalResponse>>('/api/v1/professionals?per_page=1');
      profile.value = res.data[0] ? normalizeProfessional(res.data[0]) : null;
      if (!profile.value) error.value = 'Nenhum perfil profissional encontrado pra sua conta.';
    } catch {
      error.value = 'Não foi possível carregar sua página. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function save(patch: PublicProfilePatch) {
    if (!profile.value) return false;
    saveError.value = null;
    saved.value = false;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<ProfessionalResponse>>(`/api/v1/professionals/${profile.value.id}/public-profile`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      profile.value = normalizeProfessional(res.data);
      saved.value = true;
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar sua página. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { profile, loading, showLoading, error, saving, saveError, saved, load, save };
}
