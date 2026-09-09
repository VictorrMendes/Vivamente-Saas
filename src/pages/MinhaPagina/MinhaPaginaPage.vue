<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { useMyPublicProfile } from '@/composables/useMyPublicProfile';
import { useServices } from '@/composables/useServices';
import type { Modality } from '@/types/publicProfile';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';

const MODALITY_LABEL: Record<Modality, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
};

const { profile, showLoading, error, saving, saveError, saved, load, save } = useMyPublicProfile();
const { services: catalogServices, load: loadServices } = useServices();

const form = reactive({
  photoUrl: '',
  name: '',
  bio: '',
  specialties: '',
  services: [] as string[],
  modality: 'presencial' as Modality,
  location: '',
});

watch(
  profile,
  (value) => {
    if (!value) return;
    form.photoUrl = value.photoUrl ?? '';
    form.name = value.name;
    form.bio = value.bio ?? '';
    form.specialties = (value.specialties ?? []).join(', ');
    form.services = [...(value.services ?? [])];
    form.modality = value.modality ?? 'presencial';
    form.location = value.location ?? '';
  },
  { immediate: true },
);

function toggleService(name: string) {
  const index = form.services.indexOf(name);
  if (index === -1) form.services.push(name);
  else form.services.splice(index, 1);
}

async function handleSave() {
  await save({
    photoUrl: form.photoUrl,
    name: form.name,
    bio: form.bio,
    specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
    services: form.services,
    modality: form.modality,
    location: form.location,
  });
}

const initials = computed(() =>
  form.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
);

const previewSpecialties = computed(() =>
  form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
);

onMounted(() => {
  load();
  loadServices();
});
</script>

<template>
  <div>
    <h1 class="font-display text-h3 text-text">Minha Página</h1>
    <p class="mt-1 text-body-sm text-text-muted">
      Como você aparece pra quem visita <span class="font-medium">vivamenteterapias.com.br</span>.
    </p>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>

    <div v-else class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form class="space-y-4 rounded-lg border border-border bg-surface p-4" novalidate @submit.prevent="handleSave">
        <div>
          <label for="photo-url" class="mb-1 block text-label uppercase tracking-label text-text-muted">URL da foto</label>
          <input
            id="photo-url"
            v-model="form.photoUrl"
            type="url"
            placeholder="https://…"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div>
          <label for="my-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
          <input
            id="my-name"
            v-model="form.name"
            type="text"
            required
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div>
          <label for="my-bio" class="mb-1 block text-label uppercase tracking-label text-text-muted">Bio</label>
          <textarea
            id="my-bio"
            v-model="form.bio"
            rows="4"
            class="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div>
          <label for="my-specialties" class="mb-1 block text-label uppercase tracking-label text-text-muted">
            Especialidades (separadas por vírgula)
          </label>
          <input
            id="my-specialties"
            v-model="form.specialties"
            type="text"
            placeholder="Ansiedade, Casais, TCC"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div>
          <span class="mb-1 block text-label uppercase tracking-label text-text-muted">Serviços oferecidos</span>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="service in catalogServices"
              :key="service.id"
              class="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-body-sm text-text"
            >
              <input
                type="checkbox"
                :checked="form.services.includes(service.name)"
                class="h-4 w-4 rounded border-border"
                @change="toggleService(service.name)"
              />
              {{ service.name }}
            </label>
          </div>
        </div>
        <div class="flex flex-wrap gap-4">
          <div>
            <label for="my-modality" class="mb-1 block text-label uppercase tracking-label text-text-muted">Modalidade</label>
            <select
              id="my-modality"
              v-model="form.modality"
              class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            >
              <option v-for="(label, value) in MODALITY_LABEL" :key="value" :value="value">{{ label }}</option>
            </select>
          </div>
          <div class="min-w-[200px] flex-1">
            <label for="my-location" class="mb-1 block text-label uppercase tracking-label text-text-muted">Localização</label>
            <input
              id="my-location"
              v-model="form.location"
              type="text"
              placeholder="São Paulo, SP"
              class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            />
          </div>
        </div>

        <p v-if="saveError" role="alert" class="text-body-sm text-error">{{ saveError }}</p>
        <p v-if="saved" role="status" class="text-body-sm text-success">Página atualizada.</p>
        <Button type="submit" :loading="saving">Salvar alterações</Button>
      </form>

      <div>
        <p class="mb-2 text-label uppercase tracking-label text-text-muted">Prévia da página pública</p>
        <div class="rounded-lg border border-border bg-surface p-6">
          <div class="flex items-center gap-4">
            <img
              v-if="form.photoUrl"
              :src="form.photoUrl"
              :alt="form.name"
              class="h-16 w-16 rounded-pill object-cover"
            />
            <div
              v-else
              class="flex h-16 w-16 items-center justify-center rounded-pill bg-primary-50 font-display text-h5 text-primary-700"
              aria-hidden="true"
            >
              {{ initials || '?' }}
            </div>
            <div>
              <p class="font-display text-h5 text-text">{{ form.name || 'Seu nome' }}</p>
              <p class="text-body-sm text-text-muted">{{ form.location || 'Localização' }} · {{ MODALITY_LABEL[form.modality] }}</p>
            </div>
          </div>

          <p class="mt-4 text-body-sm text-text">{{ form.bio || 'Sua bio aparece aqui.' }}</p>

          <div v-if="previewSpecialties.length" class="mt-4 flex flex-wrap gap-2">
            <Badge v-for="s in previewSpecialties" :key="s" variant="primary" size="sm">{{ s }}</Badge>
          </div>

          <div v-if="form.services.length" class="mt-4">
            <p class="text-label uppercase tracking-label text-text-muted">Serviços</p>
            <p class="mt-1 text-body-sm text-text">{{ form.services.join(', ') }}</p>
          </div>

          <p v-if="profile" class="mt-6 text-caption text-text-muted">
            vivamenteterapias.com.br/{{ profile.slug }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
