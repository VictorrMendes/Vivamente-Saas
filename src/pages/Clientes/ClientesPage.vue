<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Users } from '@lucide/vue';
import { useClients } from '@/composables/useClients';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const router = useRouter();
const { clients, pagination, showLoading, error, saving, saveError, load, create } = useClients();

const search = ref('');
const page = ref(1);
const showNewForm = ref(false);
const newClient = reactive({ name: '', email: '', phone: '' });

function fetchClients() {
  load({ page: page.value, search: search.value || undefined });
}

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    fetchClients();
  }, 400);
});

function changePage(next: number) {
  page.value = next;
  fetchClients();
}

async function handleCreate() {
  const id = await create({ ...newClient });
  if (id) router.push(`/clientes/${id}`);
}

onMounted(fetchClients);
</script>

<template>
  <div>
    <ModuleBanner :icon="Users" title="Clientes" subtitle="Busque, cadastre e acompanhe o histórico de cada cliente." />

    <div class="mt-6 flex justify-end">
      <Button variant="primary" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Novo cliente' }}
      </Button>
    </div>

    <form
      v-if="showNewForm"
      class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      novalidate
      @submit.prevent="handleCreate"
    >
      <div>
        <label for="client-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
        <input
          id="client-name"
          v-model="newClient.name"
          type="text"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="client-email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
        <input
          id="client-email"
          v-model="newClient.email"
          type="email"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="client-phone" class="mb-1 block text-label uppercase tracking-label text-text-muted">Telefone</label>
        <input
          id="client-phone"
          v-model="newClient.phone"
          type="tel"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <Button type="submit" :loading="saving">Salvar</Button>
    </form>
    <p v-if="saveError" role="alert" class="mt-2 text-body-sm text-error">{{ saveError }}</p>

    <input
      v-model="search"
      type="search"
      placeholder="Buscar por nome…"
      aria-label="Buscar clientes por nome"
      class="mt-4 h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
    />

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 5" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="clients.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum cliente encontrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="client in clients" :key="client.id">
          <RouterLink
            :to="`/clientes/${client.id}`"
            class="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <div>
              <p class="font-medium text-text">{{ client.name }}</p>
              <p class="text-body-sm text-text-muted">{{ client.email }}</p>
            </div>
            <p class="text-body-sm text-text-muted">{{ client.phone }}</p>
          </RouterLink>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>
  </div>
</template>
