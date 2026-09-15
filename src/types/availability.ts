// Confirmado no contrato real do Back: slot de data/hora específica, com
// bloqueio manual — não é recorrência semanal (postman, pasta 10. Availability).
export interface AvailabilitySlot {
  id: number;
  startsAt: string;
  endsAt: string;
  isBlocked: boolean;
}

export interface NewAvailabilitySlot {
  startsAt: string;
  endsAt: string;
}
