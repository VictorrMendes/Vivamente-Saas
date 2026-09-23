export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

/** dd/mm/aaaa a partir de ISO completo ou de uma data pura (YYYY-MM-DD, sem desvio de fuso). */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(iso));
}

/** Formata como YYYY-MM-DD em horário local (evita o desvio de dia do toISOString, que usa UTC). */
export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonth(date: Date): string {
  return toDateOnly(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): string {
  return toDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}
