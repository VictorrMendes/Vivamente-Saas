import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useProfessional } from './useProfessional';
import { useMyPublicProfile } from './useMyPublicProfile';

const base = { id: 1, user: 2, full_name: 'Teste', slug: 'teste', bio: '', is_public: true };
const read = { ...base, specialties: [{ id: 7, name: 'Psicologia' }] };
const json = (body: unknown) => new Response(JSON.stringify(body));

describe('Profissionais — serializers de leitura e escrita', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().mockLogin('ADMIN');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserva especialidades ao carregar, editar e recarregar o detalhe', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: read }))
      .mockResolvedValueOnce(json({ data: { ...base, specialty_ids: [9] } }))
      .mockResolvedValueOnce(json({ data: { ...base, specialties: [{ id: 9, name: 'Nova' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    const detail = useProfessional();
    await detail.load(1);
    expect(detail.professional.value?.specialtyIds).toEqual([7]);
    expect(await detail.update(1, { specialtyIds: [9] })).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ specialty_ids: [9] });
    expect(detail.professional.value?.specialtyIds).toEqual([9]);
    await detail.load(1);
    expect(detail.professional.value?.specialtyIds).toEqual([9]);
  });

  it('carrega o perfil do terapeuta e normaliza a resposta de public-profile', async () => {
    useAuthStore().mockLogin('THERAPIST');
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(json({ data: [read] }))
      .mockResolvedValueOnce(json({ data: { ...base, specialties: [] } })));
    const own = useMyPublicProfile();
    await own.load();
    expect(own.profile.value?.specialtyIds).toEqual([7]);
    expect(await own.save({ bio: '', isPublic: true, specialtyIds: [] })).toBe(true);
    expect(own.profile.value?.specialtyIds).toEqual([]);
  });
});
