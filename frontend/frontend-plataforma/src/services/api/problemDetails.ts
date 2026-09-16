/**
 * Extrai uma mensagem legível do corpo de erro da API — nunca o JSON cru.
 * Suporta RFC 9457 (Problem Details: `detail`/`title`) e o formato simples
 * `{ message }` usado por alguns endpoints, com fallback genérico.
 * Centralizado aqui pra client.ts e o authStore não duplicarem essa lógica.
 */
export function parseErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const problem = body as { detail?: unknown; title?: unknown; message?: unknown };
    if (typeof problem.detail === 'string' && problem.detail) return problem.detail;
    if (typeof problem.title === 'string' && problem.title) return problem.title;
    if (typeof problem.message === 'string' && problem.message) return problem.message;
  }
  return fallback;
}
