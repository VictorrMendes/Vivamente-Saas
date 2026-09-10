import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewPackage, Package } from '@/types/package';

// O Back serializa total_value como string decimal, igual price em Services.
function parseValue(pkg: Package): Package {
  return { ...pkg, totalValue: Number(pkg.totalValue) };
}

function toWireValue(pkg: NewPackage) {
  return { ...pkg, totalValue: pkg.totalValue.toFixed(2) };
}

export function usePackages() {
  const packages = ref<Package[]>([]);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<PaginatedEnvelope<Package>>('/api/v1/packages?per_page=100');
      packages.value = res.data.map(parseValue);
    } catch {
      error.value = 'Não foi possível carregar os pacotes. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function create(pkg: NewPackage) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Package>>('/api/v1/packages', {
        method: 'POST',
        body: JSON.stringify(toWireValue(pkg)),
      });
      packages.value.push(parseValue(res.data));
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o pacote. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: string) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/packages/${id}`, { method: 'DELETE' });
      packages.value = packages.value.filter((p) => p.id !== id);
    } catch {
      saveError.value = 'Não foi possível excluir o pacote. Tente novamente.';
    } finally {
      removingId.value = null;
    }
  }

  return { packages, loading, showLoading, error, saving, saveError, removingId, load, create, remove };
}
