// Confirmado direto no código real do Back (apps/appointments/models.py e
// serializers.py — APPOINTMENT_FIELDS). price/modality/service são opcionais
// no model (null=True/blank=True); professional não é exposto aqui porque a
// UI nunca precisa ler esse campo (filtra por query param quando precisa).
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
export type AppointmentRecurrence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type AppointmentModality = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

export interface Appointment {
  id: number;
  client: number;
  service?: number;
  package?: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  modality?: AppointmentModality;
  callLink?: string;
  price?: number;
  notes?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  confirmationRequestedAt?: string | null;
  confirmationSource?: 'PATIENT' | 'PROFESSIONAL' | '';
}

export type AppointmentAction = 'confirm' | 'cancel' | 'complete' | 'start' | 'reopen';

export interface NewAppointment {
  client: number;
  // Obrigatório quando quem cria é ADMIN (Back exige professional explícito
  // nesse caso — apps/appointments/services.py::create_appointment). Pra
  // THERAPIST o Back resolve sozinho e o campo é ignorado se enviado.
  professional?: number;
  service?: number | null;
  package?: number | null;
  startsAt: string;
  endsAt: string;
  modality?: AppointmentModality;
  callLink?: string;
  price?: number;
  notes?: string;
  /** Só na criação: repete no mesmo dia/horário; `occurrences` conta a 1ª consulta. */
  recurrence?: AppointmentRecurrence;
  occurrences?: number;
}

export type AppointmentPatch = Partial<NewAppointment>;
