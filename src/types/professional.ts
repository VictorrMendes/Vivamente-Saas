/**
 * Campos confirmados no contrato real do Back
 * (postman/VivaMente-Back.postman_collection.json, pastas 4 e 7/16).
 * `email`/`phone`/`active`/`modality`/`location`/`services` que existiam
 * aqui antes eram invenção minha — removidos. E-mail vive no User (via
 * `user`), não duplicado no Professional.
 */
export interface Professional {
  id: number;
  user: number;
  slug: string;
  fullName: string;
  bio: string;
  isPublic: boolean;
  specialtyIds: number[];
  photoUrl?: string;
  createdAt?: string;
}

export interface NewProfessional {
  user: number;
  slug: string;
  fullName: string;
  bio: string;
  isPublic: boolean;
  specialtyIds: number[];
}

export type ProfessionalPatch = Partial<Pick<Professional, 'fullName' | 'bio' | 'isPublic' | 'specialtyIds'>>;

export type PublicProfilePatch = Pick<Professional, 'bio' | 'photoUrl' | 'isPublic' | 'specialtyIds'>;
