// Valores confirmados no contrato real do Back (postman/VivaMente-Back.postman_collection.json).
export type LeadStatus = 'NEW' | 'CONTACTED' | 'AWAITING_RESPONSE' | 'SCHEDULED' | 'CONVERTED';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceInterest: string;
  message?: string;
  status: LeadStatus;
  createdAt: string;
}
