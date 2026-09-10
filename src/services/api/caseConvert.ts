/**
 * O Back (Django REST) fala snake_case; nosso app inteiro já foi escrito em
 * camelCase assumindo isso desde o início. Em vez de reescrever cada DTO/
 * composable pra bater com o fio, convertemos na fronteira (client.ts):
 * corpo de requisição sai em snake_case, `data` da resposta chega em
 * camelCase. Genérico e recursivo — não precisa de mapper por recurso.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

export function deepSnakeCase<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepSnakeCase(item)) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [toSnakeKey(key), deepSnakeCase(val)]),
    ) as T;
  }
  return value;
}

export function deepCamelCase<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => deepCamelCase(item)) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [toCamelKey(key), deepCamelCase(val)]),
    ) as T;
  }
  return value;
}
