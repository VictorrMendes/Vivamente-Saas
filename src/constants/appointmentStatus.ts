import type { AppointmentStatus } from '@/types/appointment';

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const APPOINTMENT_STATUS_VARIANT: Record<AppointmentStatus, 'warning' | 'primary' | 'success' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};
