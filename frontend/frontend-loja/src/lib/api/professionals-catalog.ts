import { backFetchPaginated, BackApiError } from "./back-client";
import { isMockEnabled, mockProfessionalCatalog, mockSpecialties } from "./mocks";
import type { PaginatedEnvelope, PublicProfessionalCatalogItem, Specialty } from "./types";

export interface CatalogQuery {
  page?: number;
  search?: string;
  specialty?: number;
}

/**
 * Mesma lógica de cota compartilhada de `professionals.ts::getPublicProfessional`
 * (throttle público é por IP de quem chama o Back — sempre este BFF).
 */
async function fetchCatalog(query: CatalogQuery): Promise<PaginatedEnvelope<PublicProfessionalCatalogItem>> {
  if (isMockEnabled()) return mockProfessionalCatalog();
  const params = new URLSearchParams();
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.search) params.set("search", query.search);
  if (query.specialty) params.set("specialties", String(query.specialty));
  const qs = params.toString();
  return backFetchPaginated<PublicProfessionalCatalogItem>(
    `/api/v1/public/professionals${qs ? `?${qs}` : ""}`,
    { next: { revalidate: 60 } },
  );
}

/** Opções do filtro por especialidade — só as que têm pelo menos um resultado no catálogo. */
export async function loadCatalogSpecialties(): Promise<Specialty[]> {
  if (isMockEnabled()) return mockSpecialties();
  try {
    const res = await backFetchPaginated<Specialty>("/api/v1/public/specialties?per_page=100", {
      next: { revalidate: 60 },
    });
    return res.data;
  } catch {
    // Filtro é um complemento da busca, não o caminho principal — se a lista
    // de opções falhar, a página segue funcionando sem o filtro em vez de quebrar.
    return [];
  }
}

export type LoadCatalogResult =
  | { ok: true; catalog: PaginatedEnvelope<PublicProfessionalCatalogItem> }
  | { ok: false; reason: "rate-limit" | "unavailable" };

export async function loadProfessionalsCatalog(query: CatalogQuery): Promise<LoadCatalogResult> {
  try {
    return { ok: true, catalog: await fetchCatalog(query) };
  } catch (error) {
    if (error instanceof BackApiError && error.status === 429) {
      return { ok: false, reason: "rate-limit" };
    }
    return { ok: false, reason: "unavailable" };
  }
}
