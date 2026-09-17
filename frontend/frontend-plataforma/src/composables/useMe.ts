import { ref } from 'vue';
import { backApi, oauthApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';

// Identidade é somente leitura aqui; mudanças devem partir do OAuth.
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

  return { me, loading, error, revoking, revokeError, load, revokeAllSessions };
}
