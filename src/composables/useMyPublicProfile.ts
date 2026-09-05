import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { PublicProfile, PublicProfilePatch } from '@/types/publicProfile';

export function useMyPublicProfile() {
  const profile = ref<PublicProfile | null>(null);
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
      const res = await backApi<ApiEnvelope<PublicProfile>>('/api/v1/me');
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
      const res = await backApi<ApiEnvelope<PublicProfile>>(`/api/v1/professionals/${profile.value.id}/public-profile`, {
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
