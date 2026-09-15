<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { FileEdit } from '@lucide/vue';
import { useMyPublicProfile } from '@/composables/useMyPublicProfile';
import { useSpecialties } from '@/composables/useSpecialties';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { profile, showLoading, error, saving, saveError, saved, load, save } = useMyPublicProfile();
const { specialties, load: loadSpecialties } = useSpecialties();

// Só os campos confirmados em PATCH /professionals/{id}/public-profile
// (bio, photo_url, is_public, specialty_ids) — nome/slug não fazem parte
// desse endpoint, então ficam só como leitura aqui.
const form = reactive({
  photoUrl: '',
  bio: '',
  isPublic: true,
  specialtyIds: [] as number[],
});

watch(
  profile,
  (value) => {
    if (!value) return;
    form.photoUrl = value.photoUrl ?? '';
    form.bio = value.bio;
    form.isPublic = value.isPublic;
    form.specialtyIds = [...value.specialtyIds];
  },
  { immediate: true },
);

const photoInput = ref<HTMLInputElement | null>(null);
const photoError = ref<string | null>(null);
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function handlePhotoChange(event: Event) {
  photoError.value = null;
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    photoError.value = 'Escolha um arquivo de imagem.';
  } else if (file.size > MAX_PHOTO_BYTES) {
    photoError.value = 'A imagem precisa ter até 2MB.';
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      form.photoUrl = String(reader.result);
    };
    reader.onerror = () => {
      photoError.value = 'Não foi possível ler o arquivo. Tente novamente.';
    };
    reader.readAsDataURL(file);
  }
  input.value = '';
}

function removePhoto() {
  form.photoUrl = '';
  photoError.value = null;
}

function toggleSpecialty(id: number) {
  const index = form.specialtyIds.indexOf(id);
  if (index === -1) form.specialtyIds.push(id);
  else form.specialtyIds.splice(index, 1);
}

async function handleSave() {
  await save({ ...form });
}

const initials = computed(() =>
  (profile.value?.fullName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
);

const selectedSpecialtyNames = computed(() =>
  form.specialtyIds.map((id) => specialties.value.find((s) => s.id === id)?.name).filter((name): name is string => Boolean(name)),
);

onMounted(() => {
  load();
  loadSpecialties();
});
</script>

<template>
  <div>
    <ModuleBanner
      :icon="FileEdit"
      title="Minha Página"
      subtitle="Como você aparece pra quem visita vivamenteterapias.com.br."
    />

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>

    <div v-else-if="profile" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <form class="space-y-4 rounded-lg border border-border bg-surface p-4" novalidate @submit.prevent="handleSave">
        <div>
          <label class="mb-1 block text-label uppercase tracking-label text-text-muted">Foto</label>
          <div class="flex items-center gap-3">
            <div
              v-if="form.photoUrl"
              class="h-12 w-12 shrink-0 overflow-hidden rounded-pill bg-surface-sunken"
              aria-hidden="true"
            >
              <img :src="form.photoUrl" alt="" class="h-full w-full object-cover" />
            </div>
            <input
              id="photo-file"
              ref="photoInput"
              type="file"
              accept="image/*"
              class="sr-only"
              @change="handlePhotoChange"
            />
            <Button type="button" variant="secondary" size="sm" @click="photoInput?.click()">
              {{ form.photoUrl ? 'Trocar foto' : 'Escolher foto' }}
            </Button>
            <Button v-if="form.photoUrl" type="button" variant="ghost" size="sm" @click="removePhoto">
              Remover
            </Button>
          </div>
          <p v-if="photoError" role="alert" class="mt-1 text-caption text-error">{{ photoError }}</p>
          <p v-else class="mt-1 text-caption text-text-muted">JPG ou PNG, até 2MB.</p>
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
          <span class="mb-1 block text-label uppercase tracking-label text-text-muted">Especialidades</span>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="specialty in specialties"
              :key="specialty.id"
              class="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-1.5 text-body-sm text-text"
            >
              <input
                type="checkbox"
                :checked="form.specialtyIds.includes(specialty.id)"
                class="h-4 w-4 rounded border-border"
                @change="toggleSpecialty(specialty.id)"
              />
              {{ specialty.name }}
            </label>
            <p v-if="specialties.length === 0" class="text-body-sm text-text-muted">
              Nenhuma especialidade cadastrada ainda.
            </p>
          </div>
        </div>

        <label class="flex items-center gap-2 text-body-sm text-text">
          <input v-model="form.isPublic" type="checkbox" class="h-4 w-4 rounded border-border" />
          Visível na página pública
        </label>

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
              :alt="profile.fullName"
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
              <p class="font-display text-h5 text-text">{{ profile.fullName }}</p>
              <Badge :variant="form.isPublic ? 'success' : 'neutral'" size="sm">
                {{ form.isPublic ? 'Visível' : 'Oculto' }}
              </Badge>
            </div>
          </div>

          <p class="mt-4 text-body-sm text-text">{{ form.bio || 'Sua bio aparece aqui.' }}</p>

          <div v-if="selectedSpecialtyNames.length" class="mt-4 flex flex-wrap gap-2">
            <Badge v-for="name in selectedSpecialtyNames" :key="name" variant="primary" size="sm">{{ name }}</Badge>
          </div>

          <p class="mt-6 text-caption text-text-muted">vivamenteterapias.com.br/{{ profile.slug }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
