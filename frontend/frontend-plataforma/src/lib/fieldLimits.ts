// Limites de tamanho dos campos de texto. Espelham o Back (models e
// config/limits.py) e a Loja (src/lib/field-limits.ts): mudou aqui, mude lá.
// Campo de texto sem maxlength é barrado por fieldLimits.guard.test.ts.
export const LIMITS = {
  name: 200,
  email: 254,
  phone: 30,
  document: 20,
  slug: 140,
  specialty: 120,
  url: 200,
  search: 100,
  password: 128,
  notes: 2000,
  message: 2000,
  bio: 2000,
  description: 1000,
  paymentDescription: 500,
  clinicalBlock: 50000,
} as const;
