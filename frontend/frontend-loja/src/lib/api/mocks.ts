import "server-only";
import type { AppointmentRequestResult, AvailabilitySlot, PublicProfessional } from "./types";

/**
 * Dados fictícios só pra visualizar a Loja sem precisar subir o Back.
 * Nunca ativa sozinho: exige MOCK_BACK=1 explícito E nunca em produção.
 * Não representa nenhuma profissional real (nome, registro e bio são
 * claramente marcados como exemplo).
 */
export function isMockEnabled(): boolean {
  return process.env.MOCK_BACK === "1" && process.env.NODE_ENV !== "production";
}

export function mockProfessional(slug: string): PublicProfessional {
  return {
    slug,
    full_name: "Ana Exemplo (dado fictício)",
    bio: "Texto de exemplo para visualizar a Loja em desenvolvimento — não é conteúdo real de nenhuma profissional.",
    photo_url: "",
    registration: "Registro de exemplo — dado fictício",
    specialties: [
      { id: 1, name: "Ansiedade" },
      { id: 2, name: "Terapia de casal" },
    ],
    services: [
      {
        id: 1,
        name: "Sessão individual (exemplo)",
        description: "Serviço fictício para teste visual.",
        duration_minutes: 50,
        price: "180.00",
        modality: "BOTH",
      },
      {
        id: 2,
        name: "Sessão sem valor definido (exemplo)",
        description: "Testa o estado \"valor sob consulta\".",
        duration_minutes: 50,
        price: null,
        modality: "ONLINE",
      },
    ],
  };
}

export function mockAvailableSlots(): AvailabilitySlot[] {
  const oneDay = 24 * 60 * 60 * 1000;
  const fiftyMin = 50 * 60 * 1000;
  return [1, 2].map((n) => ({
    id: n,
    professional: 1,
    starts_at: new Date(Date.now() + n * oneDay).toISOString(),
    ends_at: new Date(Date.now() + n * oneDay + fiftyMin).toISOString(),
    is_blocked: false,
  }));
}

export function mockAppointmentRequestResult(): AppointmentRequestResult {
  return { id: 1, status: "NEW" };
}
