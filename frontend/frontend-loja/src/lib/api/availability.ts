import { cache } from "react";
import { backFetch } from "./back-client";
import { isMockEnabled, mockAvailableSlots } from "./mocks";
import type { AvailabilitySlot } from "./types";

/** Slots livres mudam com mais frequência que o perfil — janela de revalidate mais curta. */
export const getAvailableSlots = cache(async (slug: string): Promise<AvailabilitySlot[]> => {
  if (isMockEnabled()) return mockAvailableSlots();
  return backFetch<AvailabilitySlot[]>(
    `/api/v1/public/professionals/${encodeURIComponent(slug)}/available-slots`,
    { next: { revalidate: 30 } },
  );
});
