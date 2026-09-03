export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
}

export type AppointmentAction = 'confirm' | 'cancel' | 'complete';
