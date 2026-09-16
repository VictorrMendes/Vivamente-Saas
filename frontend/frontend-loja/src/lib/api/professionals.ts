import { cache } from "react";
import { backFetch } from "./back-client";
import type { PublicProfessional } from "./types";

/**
 * Cacheada por request (React cache) + revalidate no fetch: o throttle público
 * do Back (30/min, ScopedRateThrottle) é medido pelo IP de quem chama — que do
 * ponto de vista do Back é sempre este BFF, nunca o visitante. Sem essa janela
 * de revalidação, visitantes simultâneos no mesmo perfil dividiriam essa cota
 * única entre si.
 */
export const getPublicProfessional = cache((slug: string) =>
  backFetch<PublicProfessional>(`/api/v1/public/professionals/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  }),
);
