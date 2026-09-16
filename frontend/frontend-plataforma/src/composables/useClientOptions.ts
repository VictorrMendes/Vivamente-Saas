import { computed, ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Client } from '@/types/client';

/**
 * Lista completa de clientes pra popular seletores (<select>, filtros) — busca
 * todas as páginas, nunca trunca silenciosamente além da 1ª (como um
 * `per_page=100` fixo faria). Usado por Agenda, Pacotes, Financeiro,
 * Dashboard e Profissional — antes cada tela repetia essa busca sozinha.
 */
export function useClientOptions() {
  const clients = ref<Client[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const all: Client[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await backApi<PaginatedEnvelope<Client>>(`/api/v1/clients?page=${page}&per_page=100`);
        all.push(...res.data);
        totalPages = res.pagination.total_pages;
        page += 1;
      } while (page <= totalPages);
      clients.value = all;
    } catch {
      error.value = 'Não foi possível carregar a lista de clientes.';
    } finally {
      loading.value = false;
    }
  }

  const clientName = computed(() => {
    const map = new Map(clients.value.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? String(id);
  });

  return { clients, loading, error, load, clientName };
}
