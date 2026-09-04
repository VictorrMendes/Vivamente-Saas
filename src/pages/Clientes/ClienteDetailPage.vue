<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useClient } from '@/composables/useClient';
import { formatDateTime } from '@/lib/datetime';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();

const {
  client,
  showLoading,
  error,
  appointments,
  appointmentsError,
  saving,
  saveError,
  deleting,
  deleteError,
  load,
  loadAppointments,
  update,
  remove,
} = useClient();

const editing = ref(false);
const editForm = reactive({ name: '', email: '', phone: '' });

function startEdit() {
  if (!client.value) return;
  editForm.name = client.value.name;
  editForm.email = client.value.email;
  editForm.phone = client.value.phone;
  editing.value = true;
}

async function handleSave() {
  const ok = await update(props.id, { ...editForm });
  if (ok) editing.value = false;
}

async function handleDelete() {
  // ponytail: confirm() nativo — mesmo padrão já usado em Agenda e Leads.
  if (!window.confirm('Excluir este cliente? Essa ação não pode ser desfeita.')) return;
  const ok = await remove(props.id);
  if (ok) router.push('/clientes');
}

const now = Date.now();
const upcomingAppointments = computed(() =>
  appointments.value.filter((a) => new Date(a.startsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
);
const pastAppointments = computed(() =>
  appointments.value
    .filter((a) => new Date(a.startsAt).getTime() < now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
);

onMounted(() => {
  load(props.id);
  loadAppointments(props.id);
});
</script>

<template>
  <div>
    <RouterLink to="/clientes" class="text-body-sm text-text-muted hover:text-text">← Voltar para Clientes</RouterLink>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4">
      <Skeleton variant="card" />
    </div>

    <template v-else-if="client">
      <h1 class="mt-4 font-display text-h3 text-text">{{ client.name }}</h1>
      <p class="mt-1 text-body-sm text-text-muted">Cliente desde {{ formatDateTime(client.createdAt) }}</p>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-h6 text-text">Informações</h2>
            <button
              v-if="!editing"
              type="button"
              class="text-body-sm text-primary-700 hover:underline"
              @click="startEdit"
            >
              Editar
            </button>
          </div>

          <form v-if="editing" class="space-y-3" novalidate @submit.prevent="handleSave">
            <div>
              <label for="edit-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
              <input
                id="edit-name"
                v-model="editForm.name"
                type="text"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
              <input
                id="edit-email"
                v-model="editForm.email"
                type="email"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-phone" class="mb-1 block text-label uppercase tracking-label text-text-muted">Telefone</label>
              <input
                id="edit-phone"
                v-model="editForm.phone"
                type="tel"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <p v-if="saveError" role="alert" class="text-body-sm text-error">{{ saveError }}</p>
            <div class="flex gap-2">
              <Button type="submit" size="sm" :loading="saving">Salvar</Button>
              <Button type="button" size="sm" variant="ghost" @click="editing = false">Cancelar</Button>
            </div>
          </form>

          <dl v-else class="space-y-2 text-body-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">E-mail</dt>
              <dd class="text-text">{{ client.email }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Telefone</dt>
              <dd class="text-text">{{ client.phone }}</dd>
            </div>
          </dl>

          <Button v-if="!editing" class="mt-6" variant="ghost" :loading="deleting" @click="handleDelete">
            Excluir cliente
          </Button>
          <p v-if="deleteError" role="alert" class="mt-2 text-body-sm text-error">{{ deleteError }}</p>
        </div>

        <div class="space-y-6">
          <div class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 font-display text-h6 text-text">Agendamentos</h2>

            <p v-if="appointmentsError" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
              {{ appointmentsError }}
            </p>
            <p v-else-if="upcomingAppointments.length === 0" class="text-body-sm text-text-muted">
              Nenhum agendamento futuro.
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="appt in upcomingAppointments"
                :key="appt.id"
                class="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-body-sm"
              >
                <span class="text-text">{{ appt.serviceName }} — {{ formatDateTime(appt.startsAt) }}</span>
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
              </li>
            </ul>
          </div>

          <div class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 font-display text-h6 text-text">Histórico operacional</h2>
            <p v-if="pastAppointments.length === 0" class="text-body-sm text-text-muted">Sem histórico ainda.</p>
            <ul v-else class="space-y-2">
              <li
                v-for="appt in pastAppointments"
                :key="appt.id"
                class="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-body-sm"
              >
                <span class="text-text">{{ appt.serviceName }} — {{ formatDateTime(appt.startsAt) }}</span>
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
