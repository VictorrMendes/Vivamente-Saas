import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { AuthUser } from '@/types/auth';
import type { Professional } from '@/types/professional';
import type { PublicProfilePatch } from '@/types/publicProfile';

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
      // /api/v1/me retorna o usuário autenticado (User), não o Professional —
      // o perfil completo (com os campos da página pública) vem de
      // /api/v1/professionals/{id}, usando o id do próprio /me.
      const me = await backApi<ApiEnvelope<AuthUser>>('/api/v1/me');
      const res = await backApi<ApiEnvelope<Professional>>(`/api/v1/professionals/${me.data.id}`);
      profile.value = res.data;
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
      const res = await backApi<ApiEnvelope<Professional>>(`/api/v1/professionals/${profile.value.id}/public-profile`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      profile.value = res.data;
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
