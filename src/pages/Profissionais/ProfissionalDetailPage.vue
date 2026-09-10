<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProfessional } from '@/composables/useProfessional';
import { useSpecialties } from '@/composables/useSpecialties';
import { backApi } from '@/services/api/client';
import { formatDateTime } from '@/lib/datetime';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';
import type { PaginatedEnvelope } from '@/types/api';
import type { Client } from '@/types/client';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();

const {
  professional,
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
} = useProfessional();
const { specialties, load: loadSpecialties } = useSpecialties();

const specialtyNameById = computed(() => new Map(specialties.value.map((s) => [s.id, s.name])));

const clients = ref<Client[]>([]);
const clientName = computed(() => {
  const map = new Map(clients.value.map((c) => [c.id, c.name]));
  return (id: string) => map.get(id) ?? id;
});
async function loadClients() {
  const res = await backApi<PaginatedEnvelope<Client>>('/api/v1/clients?per_page=100');
  clients.value = res.data;
}

const editing = ref(false);
const editForm = reactive({ fullName: '', bio: '', isPublic: true, specialtyIds: [] as string[] });

function startEdit() {
  if (!professional.value) return;
  editForm.fullName = professional.value.fullName;
  editForm.bio = professional.value.bio;
  editForm.isPublic = professional.value.isPublic;
  editForm.specialtyIds = [...professional.value.specialtyIds];
  editing.value = true;
}

function toggleEditSpecialty(id: string) {
  const index = editForm.specialtyIds.indexOf(id);
  if (index === -1) editForm.specialtyIds.push(id);
  else editForm.specialtyIds.splice(index, 1);
}

async function handleSave() {
  const ok = await update(props.id, { ...editForm });
  if (ok) editing.value = false;
}

async function handleDelete() {
  // ponytail: confirm() nativo — mesmo padrão já usado em Agenda/Leads/Clientes.
  if (!window.confirm('Excluir este profissional? Essa ação não pode ser desfeita.')) return;
  const ok = await remove(props.id);
  if (ok) router.push('/profissionais');
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
  loadSpecialties();
  loadClients();
});
</script>

<template>
  <div>
    <RouterLink to="/profissionais" class="text-body-sm text-text-muted hover:text-text">← Voltar para Profissionais</RouterLink>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4">
      <Skeleton variant="card" />
    </div>

    <template v-else-if="professional">
      <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-h3 text-text">{{ professional.fullName }}</h1>
          <p v-if="professional.createdAt" class="mt-1 text-body-sm text-text-muted">
            Profissional desde {{ formatDateTime(professional.createdAt) }}
          </p>
        </div>
        <Badge :variant="professional.isPublic ? 'success' : 'neutral'">
          {{ professional.isPublic ? 'Visível' : 'Oculto' }}
        </Badge>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-h6 text-text">Informações</h2>
            <button v-if="!editing" type="button" class="text-body-sm text-primary-700 hover:underline" @click="startEdit">
              Editar
            </button>
          </div>

          <form v-if="editing" class="space-y-3" novalidate @submit.prevent="handleSave">
            <div>
              <label for="edit-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome completo</label>
              <input
                id="edit-name"
                v-model="editForm.fullName"
                type="text"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-bio" class="mb-1 block text-label uppercase tracking-label text-text-muted">Bio</label>
              <textarea
                id="edit-bio"
                v-model="editForm.bio"
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
                    :checked="editForm.specialtyIds.includes(specialty.id)"
                    class="h-4 w-4 rounded border-border"
                    @change="toggleEditSpecialty(specialty.id)"
                  />
                  {{ specialty.name }}
                </label>
              </div>
            </div>
            <label class="flex items-center gap-2 text-body-sm text-text">
              <input v-model="editForm.isPublic" type="checkbox" class="h-4 w-4 rounded border-border" />
              Visível na página pública
            </label>
            <p v-if="saveError" role="alert" class="text-body-sm text-error">{{ saveError }}</p>
            <div class="flex gap-2">
              <Button type="submit" size="sm" :loading="saving">Salvar</Button>
              <Button type="button" size="sm" variant="ghost" @click="editing = false">Cancelar</Button>
            </div>
          </form>

          <template v-else>
            <dl class="space-y-2 text-body-sm">
              <div class="flex justify-between gap-4">
                <dt class="text-text-muted">Slug</dt>
                <dd class="text-text">{{ professional.slug }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-text-muted">Especialidades</dt>
                <dd class="text-text">
                  {{ professional.specialtyIds.map((id) => specialtyNameById.get(id)).filter(Boolean).join(', ') || '—' }}
                </dd>
              </div>
            </dl>
            <p v-if="professional.bio" class="mt-3 text-body-sm text-text">{{ professional.bio }}</p>

            <Button class="mt-6" variant="ghost" :loading="deleting" @click="handleDelete">Excluir profissional</Button>
          </template>
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
                <span class="text-text">{{ clientName(appt.client) }} — {{ formatDateTime(appt.startsAt) }}</span>
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
              </li>
            </ul>
          </div>

          <div class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 font-display text-h6 text-text">Histórico</h2>
            <p v-if="pastAppointments.length === 0" class="text-body-sm text-text-muted">Sem histórico ainda.</p>
            <ul v-else class="space-y-2">
              <li
                v-for="appt in pastAppointments"
                :key="appt.id"
                class="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-body-sm"
              >
                <span class="text-text">{{ clientName(appt.client) }} — {{ formatDateTime(appt.startsAt) }}</span>
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
