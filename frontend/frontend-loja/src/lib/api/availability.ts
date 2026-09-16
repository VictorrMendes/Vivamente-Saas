import { cache } from "react";
import { backFetch } from "./back-client";
import type { AvailabilitySlot } from "./types";

/** Slots livres mudam com mais frequência que o perfil — janela de revalidate mais curta. */
export const getAvailableSlots = cache((slug: string) =>
  backFetch<AvailabilitySlot[]>(
    `/api/v1/public/professionals/${encodeURIComponent(slug)}/available-slots`,
    { next: { revalidate: 30 } },
  ),
);
