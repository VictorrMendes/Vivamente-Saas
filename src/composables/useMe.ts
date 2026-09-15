import { ref } from 'vue';
import { backApi, oauthApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';

// Confirmado direto no código real do Back (apps/accounts/models.py e
// serializers.py). Só `email` é editável via PATCH — os demais campos são
// somente leitura (UserUpdateSerializer real só aceita "email").
export interface Me {
  id: number;
  firebaseUid: string;
  email: string;
  role: 'ADMIN' | 'THERAPIST';
  active: boolean;
}

export function useMe() {
  const me = ref<Me | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const saved = ref(false);
  const revoking = ref(false);
  const revokeError = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await backApi<ApiEnvelope<Me>>('/api/v1/me');
      me.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar seu perfil. Tente novamente em instantes.';
    } finally {
      loading.value = false;
    }
  }

  async function updateEmail(email: string) {
    saveError.value = null;
    saved.value = false;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Me>>('/api/v1/me', { method: 'PATCH', body: JSON.stringify({ email }) });
      me.value = res.data;
      saved.value = true;
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o e-mail. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  /** Confirmado em backend/Oauth/apps/auth/views.py::TokenRevokeView — revoga os refresh tokens em todos os dispositivos. */
  async function revokeAllSessions() {
    revokeError.value = null;
    revoking.value = true;
    try {
      await oauthApi('/oauth/v1/tokens/revoke', { method: 'POST' });
      return true;
    } catch {
      revokeError.value = 'Não foi possível encerrar as sessões. Tente novamente.';
      return false;
    } finally {
      revoking.value = false;
    }
  }

  return { me, loading, error, saving, saveError, saved, revoking, revokeError, load, updateEmail, revokeAllSessions };
}
