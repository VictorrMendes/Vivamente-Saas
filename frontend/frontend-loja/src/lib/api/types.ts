/**
 * Contrato confirmado por leitura direta do código do Back (serializers/views/tests
 * em backend/back), não pela documentação. Divergências relevantes:
 * - GET público: snake_case (full_name, photo_url, duration_minutes, starts_at...).
 * - POST público: só professionalSlug/preferredSlot em camelCase; o resto é minúsculo simples.
 * - Não existe endpoint público de listagem de profissionais.
 * - Não há campos de endereço/localização em nenhum serializer público.
 */

export interface Envelope<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
}

export interface Specialty {
  id: number;
  name: string;
}

export type ServiceModality = "ONLINE" | "IN_PERSON" | "BOTH";

export interface PublicService {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  /** DecimalField do Django serializado como string (ex: "150.00") pela config padrão do DRF. */
  price: string | null;
  modality: ServiceModality;
}

export interface PublicProfessional {
  slug: string;
  full_name: string;
  bio: string;
  photo_url: string;
  registration: string;
  specialties: Specialty[];
  services: PublicService[];
}

export interface AvailabilitySlot {
  id: number;
  professional: number;
  starts_at: string;
  ends_at: string;
  is_blocked: boolean;
}

export interface AppointmentRequestInput {
  professionalSlug: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  service?: number | null;
  preferredSlot?: string | null;
}

export interface AppointmentRequestResult {
  id: number;
  status: string;
}

/** Formato real de erro do Back: "RFC 9457-like", sem `errors` estruturado por campo. */
export interface ApiErrorBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  request_id: string;
}
