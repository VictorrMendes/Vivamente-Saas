import type { AppointmentModality } from '@/types/appointment';

export const APPOINTMENT_MODALITY_LABEL: Record<AppointmentModality, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'Presencial',
  HYBRID: 'Híbrido',
};
