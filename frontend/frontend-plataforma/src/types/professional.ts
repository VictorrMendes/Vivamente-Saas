/** Modelo usado pelas telas, após normalizar os serializers de leitura/escrita. */
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

/** GET inclui objetos em specialties; POST/PATCH devolvem specialty_ids. */
export type ProfessionalResponse = Omit<Professional, 'specialtyIds'> & (
  | { specialties: { id: number; name: string }[]; specialtyIds?: never }
  | { specialtyIds: number[]; specialties?: never }
);

export function normalizeProfessional(response: ProfessionalResponse): Professional {
  return {
    ...response,
    specialtyIds: response.specialties?.map((specialty) => specialty.id) ?? response.specialtyIds ?? [],
  };
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
