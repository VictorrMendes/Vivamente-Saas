<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProfessionals } from '@/composables/useProfessionals';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';

const router = useRouter();
const { professionals, pagination, showLoading, error, saving, saveError, load, create } = useProfessionals();

const search = ref('');
const page = ref(1);
const showNewForm = ref(false);
const newProfessional = reactive({ name: '', email: '', phone: '', specialties: '', active: true });

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
  const id = await create({
    name: newProfessional.name,
    email: newProfessional.email,
    phone: newProfessional.phone,
    specialties: newProfessional.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    active: newProfessional.active,
  });
  if (id) router.push(`/profissionais/${id}`);
}

onMounted(fetchProfessionals);
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-display text-h3 text-text">Profissionais</h1>
      <Button variant="primary" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Novo profissional' }}
      </Button>
    </div>

    <form
      v-if="showNewForm"
      class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      novalidate
      @submit.prevent="handleCreate"
    >
      <div>
        <label for="prof-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
        <input
          id="prof-name"
          v-model="newProfessional.name"
          type="text"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="prof-email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
        <input
          id="prof-email"
          v-model="newProfessional.email"
          type="email"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="prof-phone" class="mb-1 block text-label uppercase tracking-label text-text-muted">Telefone</label>
        <input
          id="prof-phone"
          v-model="newProfessional.phone"
          type="tel"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div class="min-w-[200px] flex-1">
        <label for="prof-specialties" class="mb-1 block text-label uppercase tracking-label text-text-muted">
          Especialidades (separadas por vírgula)
        </label>
        <input
          id="prof-specialties"
          v-model="newProfessional.specialties"
          type="text"
          placeholder="Ansiedade, Casais, TCC"
          class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
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
              <p class="font-medium text-text">{{ prof.name }}</p>
              <p class="text-body-sm text-text-muted">{{ prof.email }}</p>
              <p v-if="prof.specialties.length" class="mt-1 text-caption text-text-muted">
                {{ prof.specialties.join(', ') }}
              </p>
            </div>
            <Badge :variant="prof.active ? 'success' : 'neutral'" size="sm">
              {{ prof.active ? 'Ativo' : 'Inativo' }}
            </Badge>
          </RouterLink>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>
  </div>
</template>
