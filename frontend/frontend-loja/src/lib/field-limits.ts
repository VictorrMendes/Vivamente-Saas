// Limites de tamanho dos campos dos formulários públicos. Espelham o Back
// (models e config/limits.py) e a Plataforma (src/lib/fieldLimits.ts): mudou
// lá, mude aqui. Campo de texto sem maxLength é barrado por field-limits.test.ts.
export const LIMITS = {
  name: 200,
  email: 254,
  phone: 30,
  specialty: 200,
  message: 2000,
  search: 100,
} as const;
