import type { Professional } from './professional';

export type { Modality } from './professional';

/**
 * A página pública é só um subconjunto de campos do Professional (docs,
 * seção 7 do front-plataforma.md) — não é mais uma entidade separada.
 * Ver `useMyPublicProfile` pra como isso é buscado (GET /me -> GET /professionals/{id}).
 */
export type PublicProfilePatch = Required<
  Pick<Professional, 'photoUrl' | 'name' | 'bio' | 'specialties' | 'services' | 'modality' | 'location'>
>;
