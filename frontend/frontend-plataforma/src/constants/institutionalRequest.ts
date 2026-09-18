import type { InstitutionalRequestKind, InstitutionalRequestStatus } from '@/types/institutionalRequest';

export const INSTITUTIONAL_KIND_LABEL: Record<InstitutionalRequestKind, string> = {
  PATIENT: 'Paciente',
  THERAPIST_INTEREST: 'Terapeuta interessado',
};

export const INSTITUTIONAL_STATUS_LABEL: Record<InstitutionalRequestStatus, string> = {
  NEW: 'Novo',
  IN_PROGRESS: 'Em acompanhamento',
  FORWARDED: 'Encaminhado',
  CLOSED: 'Encerrado',
};

export const INSTITUTIONAL_STATUS_VARIANT: Record<InstitutionalRequestStatus, 'info' | 'warning' | 'success' | 'secondary'> = {
  NEW: 'info',
  IN_PROGRESS: 'warning',
  FORWARDED: 'success',
  CLOSED: 'secondary',
};
