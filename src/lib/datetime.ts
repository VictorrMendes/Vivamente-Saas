export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
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
