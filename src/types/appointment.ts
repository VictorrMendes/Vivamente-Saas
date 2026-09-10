// Valores confirmados no contrato real do Back (postman/VivaMente-Back.postman_collection.json).
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  clientName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
}

export type AppointmentAction = 'confirm' | 'cancel' | 'complete';
