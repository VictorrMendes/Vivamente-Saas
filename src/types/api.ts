export interface ApiEnvelope<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
}

export interface PaginatedEnvelope<T> {
  data: T[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}
