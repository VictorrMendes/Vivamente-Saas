<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { UserCog } from '@lucide/vue';
import { useProfessionals } from '@/composables/useProfessionals';
import { useSpecialties } from '@/composables/useSpecialties';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const router = useRouter();
const { professionals, pagination, showLoading, error, saving, saveError, load, create } = useProfessionals();
const { specialties, load: loadSpecialties, create: createSpecialty } = useSpecialties();

const search = ref('');
const page = ref(1);
const showNewForm = ref(false);
const newProfessional = reactive({ user: 0, slug: '', fullName: '', bio: '', isPublic: true, specialtyIds: [] as number[] });
const newSpecialtyName = ref('');

const specialtyNameById = computed(() => new Map(specialties.value.map((s) => [s.id, s.name])));

function toggleSpecialty(id: number) {
  const index = newProfessional.specialtyIds.indexOf(id);
  if (index === -1) newProfessional.specialtyIds.push(id);
  else newProfessional.specialtyIds.splice(index, 1);
}

async function handleAddSpecialty() {
  const name = newSpecialtyName.value.trim();
  if (!name) return;
  const created = await createSpecialty(name);
  if (created) {
    newProfessional.specialtyIds.push(created.id);
    newSpecialtyName.value = '';
  }
}

function fetchProfessionals() {
  load({ page: page.value, search: search.value || undefined });
}

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    fetchProfessionals();
  }, 400);
});

function changePage(next: number) {
  page.value = next;
  fetchProfessionals();
}

async function handleCreate() {
  const id = await create({ ...newProfessional });
  if (id) router.push(`/profissionais/${id}`);
}

onMounted(() => {
  fetchProfessionals();
  loadSpecialties();
});
</script>

<template>
  <div>
    <ModuleBanner :icon="UserCog" title="Profissionais" subtitle="Gestão de terapeutas cadastrados na plataforma." />

    <div class="mt-6 flex justify-end">
      <Button variant="primary" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Novo profissional' }}
      </Button>
    </div>

    <form
      v-if="showNewForm"
      class="mt-4 space-y-4 rounded-lg border border-border bg-surface p-4"
      novalidate
      @submit.prevent="handleCreate"
    >
      <p class="rounded-md bg-info-bg px-3 py-2 text-caption text-info">
        O profissional precisa de uma conta já existente (Firebase) — informe o ID de usuário dela. Ainda não temos uma
        tela de busca de usuários; até lá, o ADMIN precisa desse ID por fora.
      </p>
      <div class="flex flex-wrap gap-3">
        <div>
          <label for="prof-user" class="mb-1 block text-label uppercase tracking-label text-text-muted">ID do usuário</label>
          <input
            id="prof-user"
            v-model.number="newProfessional.user"
            type="number"
            required
            class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div>
          <label for="prof-slug" class="mb-1 block text-label uppercase tracking-label text-text-muted">Slug (URL pública)</label>
          <input
            id="prof-slug"
            v-model="newProfessional.slug"
            type="text"
            required
            placeholder="ana-reis"
            class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div class="min-w-[200px] flex-1">
          <label for="prof-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome completo</label>
          <input
            id="prof-name"
            v-model="newProfessional.fullName"
            type="text"
            required
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
      </div>
      <div>
        <label for="prof-bio" class="mb-1 block text-label uppercase tracking-label text-text-muted">Bio</label>
        <textarea
          id="prof-bio"
          v-model="newProfessional.bio"
          rows="3"
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
              :checked="newProfessional.specialtyIds.includes(specialty.id)"
              class="h-4 w-4 rounded border-border"
              @change="toggleSpecialty(specialty.id)"
            />
            {{ specialty.name }}
          </label>
        </div>
        <div class="mt-2 flex items-end gap-2">
          <input
            v-model="newSpecialtyName"
            type="text"
            placeholder="Nova especialidade"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          />
          <Button type="button" size="sm" variant="secondary" @click="handleAddSpecialty">Adicionar</Button>
        </div>
      </div>
      <label class="flex items-center gap-2 text-body-sm text-text">
        <input v-model="newProfessional.isPublic" type="checkbox" class="h-4 w-4 rounded border-border" />
        Visível na página pública
      </label>
      <Button type="submit" :loading="saving">Salvar</Button>
    </form>
    <p v-if="saveError" role="alert" class="mt-2 text-body-sm text-error">{{ saveError }}</p>

    <input
      v-model="search"
      type="search"
      placeholder="Buscar por nome…"
      aria-label="Buscar profissionais por nome"
      class="mt-4 h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
    />

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 5" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="professionals.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum profissional encontrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="prof in professionals" :key="prof.id">
          <RouterLink
            :to="`/profissionais/${prof.id}`"
            class="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <div>
              <p class="font-medium text-text">{{ prof.fullName }}</p>
              <p v-if="prof.specialtyIds.length" class="mt-1 text-caption text-text-muted">
                {{ prof.specialtyIds.map((id) => specialtyNameById.get(id)).filter(Boolean).join(', ') }}
              </p>
            </div>
            <Badge :variant="prof.isPublic ? 'success' : 'neutral'" size="sm">
              {{ prof.isPublic ? 'Visível' : 'Oculto' }}
            </Badge>
          </RouterLink>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>
  </div>
</template>
