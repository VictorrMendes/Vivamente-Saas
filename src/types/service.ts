// Confirmado no contrato real do Back (postman, pasta 6. Services).
export type ServiceModality = 'ONLINE' | 'IN_PERSON' | 'BOTH';

export interface Service {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  modality: ServiceModality;
}

export interface NewService {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  modality: ServiceModality;
}
