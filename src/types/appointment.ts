// Confirmado direto no código real do Back (apps/appointments/models.py e
// serializers.py — APPOINTMENT_FIELDS). price/modality/service são opcionais
// no model (null=True/blank=True); professional não é exposto aqui porque a
// UI nunca precisa ler esse campo (filtra por query param quando precisa).
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type AppointmentModality = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

export interface Appointment {
  id: string;
  client: string;
  service?: string;
  package?: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  modality?: AppointmentModality;
  callLink?: string;
  price?: number;
  notes?: string;
}

export type AppointmentAction = 'confirm' | 'cancel' | 'complete';
