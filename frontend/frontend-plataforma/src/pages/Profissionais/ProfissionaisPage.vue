<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { UserCog } from '@lucide/vue';
import { useProfessionals } from '@/composables/useProfessionals';
import { useSpecialties } from '@/composables/useSpecialties';
import { useUserLookup, type UserLookupResult } from '@/composables/useUserLookup';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const router = useRouter();
const route = useRoute();
const { professionals, pagination, showLoading, error, saving, saveError, load, create } = useProfessionals();
const { specialties, load: loadSpecialties, create: createSpecialty } = useSpecialties();
const { results: userResults, loading: userSearchLoading, error: userSearchError, search: searchUsers } = useUserLookup();

const search = ref('');
const page = ref(1);
const showNewForm = ref(false);
const newProfessional = reactive({ user: 0, slug: '', fullName: '', bio: '', isPublic: true, specialtyIds: [] as number[] });
const newSpecialtyName = ref('');
const userSearch = ref('');
const selectedUser = ref<UserLookupResult | null>(null);

const specialtyNameById = computed(() => new Map(specialties.value.map((s) => [s.id, s.name])));

function selectUser(user: UserLookupResult) {
  selectedUser.value = user;
  newProfessional.user = user.id;
  userResults.value = [];
}

let userSearchTimer: ReturnType<typeof setTimeout>;
watch(userSearch, (value) => {
  if (selectedUser.value && value !== selectedUser.value.email) selectedUser.value = null;
  newProfessional.user = 0;
  clearTimeout(userSearchTimer);
  userSearchTimer = setTimeout(() => searchUsers(value), 400);
});

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
  if (!selectedUser.value) return;
  const id = await create({ ...newProfessional });
  if (id) router.push(`/profissionais/${id}`);
}

onMounted(() => {
  fetchProfessionals();
  loadSpecialties();

  // Chegando da fila institucional (botão "Criar perfil profissional" em
  // InstitucionalPage.vue) com e-mail/nome já conhecidos — abre o form
  // pré-preenchido e já dispara a busca do usuário pelo e-mail.
  const emailParam = route.query.email;
  const fullNameParam = route.query.fullName;
  if (typeof emailParam === 'string' && emailParam) {
    showNewForm.value = true;
    userSearch.value = emailParam;
    if (typeof fullNameParam === 'string' && fullNameParam) newProfessional.fullName = fullNameParam;
  }
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
        O profissional precisa de uma conta já existente (Firebase) — busque pelo e-mail e confirme a pessoa certa.
      </p>
      <div class="flex flex-wrap gap-3">
        <div class="min-w-[240px]">
          <label for="prof-user-search" class="mb-1 block text-label uppercase tracking-label text-text-muted">Conta de acesso (e-mail)</label>
          <input
            id="prof-user-search"
            v-model="userSearch"
            type="text"
            autocomplete="off"
            required
            placeholder="e-mail da conta já criada"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
          <p v-if="selectedUser" class="mt-1 text-caption text-success">
            Selecionado: {{ selectedUser.email }} ({{ selectedUser.role }})
          </p>
          <p v-else-if="userSearchError" class="mt-1 text-caption text-error">{{ userSearchError }}</p>
          <ul v-else-if="userSearchLoading" class="mt-1 text-caption text-text-muted">Buscando…</ul>
          <ul v-else-if="userResults.length > 0" class="mt-1 space-y-1 rounded-md border border-border bg-surface-sunken p-2">
            <li v-for="user in userResults" :key="user.id">
              <button
                type="button"
                class="w-full rounded px-2 py-1 text-left text-caption text-text hover:bg-surface"
                @click="selectUser(user)"
              >
                {{ user.email }} <span class="text-text-muted">({{ user.role }}{{ user.active ? '' : ', inativo' }})</span>
              </button>
            </li>
          </ul>
          <p v-else-if="userSearch.trim() && !selectedUser" class="mt-1 text-caption text-text-muted">Nenhuma conta encontrada com esse e-mail.</p>
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
      <Button type="submit" :loading="saving" :disabled="!selectedUser">Salvar</Button>
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
