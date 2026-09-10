/**
 * Campos confirmados no contrato real do Back
 * (postman/VivaMente-Back.postman_collection.json, pastas 4 e 7/16).
 * `email`/`phone`/`active`/`modality`/`location`/`services` que existiam
 * aqui antes eram invenção minha — removidos. E-mail vive no User (via
 * `user`), não duplicado no Professional.
 */
export interface Professional {
  id: string;
  user: string;
  slug: string;
  fullName: string;
  bio: string;
  isPublic: boolean;
  specialtyIds: string[];
  photoUrl?: string;
  createdAt?: string;
}

export interface NewProfessional {
  user: string;
  slug: string;
  fullName: string;
  bio: string;
  isPublic: boolean;
  specialtyIds: string[];
}

export type ProfessionalPatch = Partial<Pick<Professional, 'fullName' | 'bio' | 'isPublic' | 'specialtyIds'>>;

export type PublicProfilePatch = Pick<Professional, 'bio' | 'photoUrl' | 'isPublic' | 'specialtyIds'>;
