import { backFetchPaginated, BackApiError } from "./back-client";
import { isMockEnabled, mockProfessionalCatalog } from "./mocks";
import type { PaginatedEnvelope, PublicProfessionalCatalogItem } from "./types";

export interface CatalogQuery {
  page?: number;
  search?: string;
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
  const qs = params.toString();
  return backFetchPaginated<PublicProfessionalCatalogItem>(
    `/api/v1/public/professionals${qs ? `?${qs}` : ""}`,
    { next: { revalidate: 60 } },
  );
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
