import { cache } from "react";
import { notFound } from "next/navigation";
import { backFetch, BackApiError } from "./back-client";
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

export type LoadProfessionalResult =
  | { ok: true; professional: PublicProfessional }
  | { ok: false; reason: "rate-limit" | "unavailable" };

/** Slug inexistente e perfil não-público retornam o mesmo 404 no Back (de propósito, não vaza existência). */
export async function loadPublicProfessional(slug: string): Promise<LoadProfessionalResult> {
  try {
    const professional = await getPublicProfessional(slug);
    return { ok: true, professional };
  } catch (error) {
    if (error instanceof BackApiError && error.status === 404) {
      notFound();
    }
    if (error instanceof BackApiError && error.status === 429) {
      return { ok: false, reason: "rate-limit" };
    }
    return { ok: false, reason: "unavailable" };
  }
}

export function backendErrorMessage(reason: "rate-limit" | "unavailable"): string {
  return reason === "rate-limit"
    ? "Estamos com muitos acessos agora. Tente novamente em instantes."
    : "Não conseguimos carregar essa página agora. Tente novamente em instantes.";
}
