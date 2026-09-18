import "server-only";
import { env } from "@/lib/env";
import type { ApiErrorBody, Envelope, PaginatedEnvelope } from "./types";

/** Erro estruturado retornado pelo Back (4xx/5xx com corpo RFC-9457-like). */
export class BackApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null,
  ) {
    super(body?.detail ?? `Back respondeu ${status} sem corpo de erro legível.`);
    this.name = "BackApiError";
  }
}

/** Falha de rede/infra ao tentar falar com o Back — nunca deve virar "não encontrado" na UI. */
export class BackUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Não foi possível conectar ao Back.");
    this.name = "BackUnavailableError";
    this.cause = cause;
  }
}

async function fetchJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${env.backApiUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (cause) {
    throw new BackUnavailableError(cause);
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw new BackApiError(response.status, body);
  }

  return response.json();
}

/**
 * Cliente HTTP server-side para os endpoints públicos do Back. Desembrulha o
 * envelope `{ data, meta }` e nunca loga corpo de request/response (pode
 * conter dados pessoais em .../appointment-requests e .../institutional-requests).
 */
export async function backFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const envelope = (await fetchJson(path, init)) as Envelope<T>;
  return envelope.data;
}

/** Igual a `backFetch`, mas para listagens paginadas (`{ data, pagination }`). */
export async function backFetchPaginated<T>(path: string, init?: RequestInit): Promise<PaginatedEnvelope<T>> {
  return (await fetchJson(path, init)) as PaginatedEnvelope<T>;
}
