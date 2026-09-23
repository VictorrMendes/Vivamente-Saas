import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewPackagePlan, PackagePlan } from '@/types/package';

// O Back serializa total_value como string decimal, igual em Packages.
function parsePlan(plan: PackagePlan): PackagePlan {
  return { ...plan, totalValue: Number(plan.totalValue) };
}

/** Catálogo de planos do profissional: só modelos (sem cliente). */
export function usePackagePlans() {
  const plans = ref<PackagePlan[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<number | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const res = await backApi<PaginatedEnvelope<PackagePlan>>('/api/v1/package-plans?per_page=100');
      plans.value = res.data.map(parsePlan);
    } catch {
      error.value = 'Não foi possível carregar os pacotes. Tente novamente em instantes.';
    } finally {
      loading.value = false;
    }
  }

  async function create(plan: NewPackagePlan) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<PackagePlan>>('/api/v1/package-plans', {
        method: 'POST',
        body: JSON.stringify({ ...plan, totalValue: plan.totalValue.toFixed(2) }),
      });
      const created = parsePlan(res.data);
      plans.value = [...plans.value, created].sort((a, b) => a.name.localeCompare(b.name));
      return created;
    } catch (err) {
      saveError.value = err instanceof ApiError && err.status === 400 ? err.message : 'Não foi possível salvar o pacote. Tente novamente.';
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function update(id: number, plan: NewPackagePlan) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<PackagePlan>>(`/api/v1/package-plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...plan, totalValue: plan.totalValue.toFixed(2) }),
      });
      const updated = parsePlan(res.data);
      plans.value = plans.value.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name));
      return true;
    } catch (err) {
      saveError.value = err instanceof ApiError && err.status === 400 ? err.message : 'Não foi possível salvar o pacote. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: number) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/package-plans/${id}`, { method: 'DELETE' });
      plans.value = plans.value.filter((p) => p.id !== id);
      return true;
    } catch {
      saveError.value = 'Não foi possível excluir o pacote. Tente novamente.';
      return false;
    } finally {
      removingId.value = null;
    }
  }

  return { plans, loading, error, saving, saveError, removingId, load, create, update, remove };
}
