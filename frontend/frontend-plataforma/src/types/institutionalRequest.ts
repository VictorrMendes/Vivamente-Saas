// Confirmado no contrato real do Back (apps/institutional_requests).
export type InstitutionalRequestKind = 'PATIENT' | 'THERAPIST_INTEREST';
export type InstitutionalRequestStatus = 'NEW' | 'IN_PROGRESS' | 'FORWARDED' | 'CLOSED';

export interface InstitutionalRequest {
  id: number;
  kind: InstitutionalRequestKind;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InstitutionalRequestStatus;
  forwardedTo: number | null;
  forwardedLead: number | null;
  forwardedAt: string | null;
  createdAt: string;
}
