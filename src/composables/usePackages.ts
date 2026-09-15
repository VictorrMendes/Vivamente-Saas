import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewPackage, Package, PackagePatch } from '@/types/package';

// O Back serializa total_value como string decimal, igual price em Services.
function parseValue(pkg: Package): Package {
  return { ...pkg, totalValue: Number(pkg.totalValue) };
}

function toWireValue<T extends { totalValue?: number }>(input: T) {
  return { ...input, totalValue: input.totalValue != null ? input.totalValue.toFixed(2) : undefined };
}

interface PackagesQuery {
  page?: number;
  perPage?: number;
  client?: number;
  status?: Package['status'];
}

export function usePackages() {
  const packages = ref<Package[]>([]);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const removingId = ref<number | null>(null);
  const pagination = ref<PaginatedEnvelope<Package>['pagination'] | null>(null);

  // client/status são suportados pelo filterset_fields real do PackageViewSet — vão na query.
  async function load(params: PackagesQuery = {}) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: String(params.perPage ?? 10) });
    if (params.client) query.set('client', String(params.client));
    if (params.status) query.set('status', params.status);

    try {
      const res = await backApi<PaginatedEnvelope<Package>>(`/api/v1/packages?${query}`);
      packages.value = res.data.map(parseValue);
      pagination.value = res.pagination;
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

  async function update(id: number, patch: PackagePatch) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Package>>(`/api/v1/packages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toWireValue(patch)),
      });
      const index = packages.value.findIndex((p) => p.id === id);
      if (index !== -1) packages.value[index] = parseValue(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o pacote. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function remove(id: number) {
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

  return { packages, loading, showLoading, error, saving, saveError, removingId, pagination, load, create, update, remove };
}
