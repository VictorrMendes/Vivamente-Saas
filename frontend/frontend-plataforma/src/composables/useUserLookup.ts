import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';

// Contrato de GET /api/v1/users (apps/accounts/serializers.py::UserSerializer,
// ADMIN-only) — não confundir com o Professional: esse é o User local (conta
// de acesso), usado aqui só pra achar o id numérico a informar em "user" na
// criação de um Professional.
export interface UserLookupResult {
  id: number;
  email: string;
  role: 'ADMIN' | 'THERAPIST';
  active: boolean;
}

export function useUserLookup() {
  const results = ref<UserLookupResult[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function search(email: string) {
    error.value = null;
    if (!email.trim()) {
      results.value = [];
      return;
    }
    loading.value = true;
    try {
      const res = await backApi<PaginatedEnvelope<UserLookupResult>>(
        `/api/v1/users?search=${encodeURIComponent(email)}&per_page=10`,
      );
      results.value = res.data;
    } catch {
      error.value = 'Não foi possível buscar o usuário. Tente novamente.';
      results.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { results, loading, error, search };
}
