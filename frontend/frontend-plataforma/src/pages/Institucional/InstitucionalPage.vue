<script setup lang="ts">
import { LIMITS } from '@/lib/fieldLimits';
import { onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { Inbox, RotateCw } from '@lucide/vue';
import { useInstitutionalRequests } from '@/composables/useInstitutionalRequests';
import { useForwardTargets } from '@/composables/useForwardTargets';
import {
  INSTITUTIONAL_KIND_LABEL,
  INSTITUTIONAL_STATUS_LABEL,
  INSTITUTIONAL_STATUS_VARIANT,
} from '@/constants/institutionalRequest';
import type { InstitutionalRequestKind } from '@/types/institutionalRequest';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const {
  requests,
  pagination,
  showLoading,
  error,
  forwardingIds,
  forwardError,
  statusChangingIds,
  statusError,
  accountCreatingIds,
  accountCreatedIds,
  emailSentIds,
  emailErrors,
  accountError,
  isRowBusy,
  load,
  forward,
  setStatus,
  createAccessAccount,
  resendAccessEmail,
  resumeAccessAccount,
} = useInstitutionalRequests();
const { professionals, loading: targetsLoading, error: targetsError, load: loadTargets } = useForwardTargets();

const activeKind = ref<InstitutionalRequestKind | null>(null);
const search = ref('');
const page = ref(1);
const forwardSelection = reactive<Record<number, string>>({});

function fetchRequests() {
  load({ page: page.value, kind: activeKind.value ?? undefined, search: search.value || undefined });
}

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    fetchRequests();
  }, 400);
});

function setKind(kind: InstitutionalRequestKind | null) {
  activeKind.value = kind;
  page.value = 1;
  fetchRequests();
}

function changePage(next: number) {
  page.value = next;
  fetchRequests();
}

async function handleForward(id: number) {
  const professionalId = Number(forwardSelection[id]);
  if (!professionalId || isRowBusy(id)) return;
  await forward(id, professionalId);
}

function handleSetStatus(id: number, status: 'IN_PROGRESS' | 'CLOSED') {
  if (isRowBusy(id)) return;
  setStatus(id, status);
}

function handleCreateAccount(id: number, email: string) {
  if (isRowBusy(id)) return;
  createAccessAccount(id, email);
}

function newProfessionalLink(item: { name: string; email: string }) {
  return `/profissionais?${new URLSearchParams({ email: item.email, fullName: item.name })}`;
}

onMounted(() => {
  fetchRequests();
  loadTargets();
});
</script>

<template>
  <div>
    <ModuleBanner
      :icon="Inbox"
      title="Institucional"
      subtitle="Pedidos de indicação de pacientes e manifestações de interesse de terapeutas, recebidos pela home e por /contato."
    />

    <div class="mt-4 flex flex-wrap items-center gap-4">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        <button
          type="button"
          class="rounded-pill px-3 py-1.5 text-body-sm transition-colors"
          :class="activeKind === null ? 'bg-primary-600 text-text-inverse' : 'bg-surface-sunken text-text-muted hover:text-text'"
          :aria-pressed="activeKind === null"
          @click="setKind(null)"
        >
          Todos
        </button>
        <button
          v-for="(label, kind) in INSTITUTIONAL_KIND_LABEL"
          :key="kind"
          type="button"
          class="rounded-pill px-3 py-1.5 text-body-sm transition-colors"
          :class="activeKind === kind ? 'bg-primary-600 text-text-inverse' : 'bg-surface-sunken text-text-muted hover:text-text'"
          :aria-pressed="activeKind === kind"
          @click="setKind(kind as InstitutionalRequestKind)"
        >
          {{ label }}
        </button>
      </div>

      <input
        :maxlength="LIMITS.search"
        v-model="search"
        type="search"
        placeholder="Buscar por nome…"
        aria-label="Buscar solicitações por nome"
        class="ml-auto h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
      />
    </div>

    <p v-if="forwardError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">{{ forwardError }}</p>
    <p v-if="statusError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">{{ statusError }}</p>
    <p v-if="accountError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">{{ accountError }}</p>

    <!-- Erro e lista vazia são estados distintos: erro nunca mostra "nenhuma solicitação encontrada". -->
    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
      <button type="button" class="ml-2 underline" @click="fetchRequests">Tentar novamente</button>
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 5" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="requests.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhuma solicitação institucional encontrada.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="item in requests" :key="item.id" class="rounded-lg border border-border bg-surface p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-text">{{ item.name }}</p>
              <p class="text-body-sm text-text-muted">{{ item.email }}</p>
              <p v-if="item.phone" class="text-body-sm text-text-muted">{{ item.phone }}</p>
              <p v-if="item.message" class="mt-2 max-w-xl text-body-sm text-text-muted">{{ item.message }}</p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <Badge :variant="INSTITUTIONAL_STATUS_VARIANT[item.status]" size="sm">{{ INSTITUTIONAL_STATUS_LABEL[item.status] }}</Badge>
              <Badge variant="secondary" size="sm">{{ INSTITUTIONAL_KIND_LABEL[item.kind] }}</Badge>
            </div>
          </div>

          <!-- Paciente sem terapeuta ainda: encaminhar. Encerrado ou já encaminhado são estados terminais — nunca oferecer o form de encaminhar. -->
          <div
            v-if="item.kind === 'PATIENT' && item.status !== 'FORWARDED' && item.status !== 'CLOSED'"
            class="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4"
          >
            <div>
              <label :for="`forward-${item.id}`" class="mb-1 block text-label uppercase tracking-label text-text-muted">Encaminhar para</label>
              <select
                v-if="!targetsError"
                :id="`forward-${item.id}`"
                v-model="forwardSelection[item.id]"
                :disabled="targetsLoading || professionals.length === 0"
                class="h-9 min-w-[220px] rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600 disabled:opacity-60"
              >
                <option value="">
                  {{ targetsLoading ? 'Carregando terapeutas…' : professionals.length === 0 ? 'Nenhum terapeuta elegível' : 'Selecione um terapeuta' }}
                </option>
                <option v-for="p in professionals" :key="p.id" :value="p.id">{{ p.fullName }}</option>
              </select>
              <p v-else class="flex items-center gap-2 text-body-sm text-error">
                {{ targetsError }}
                <button type="button" class="inline-flex items-center gap-1 underline" @click="loadTargets">
                  <RotateCw :size="14" aria-hidden="true" /> Tentar novamente
                </button>
              </p>
            </div>
            <Button
              size="sm"
              :disabled="!forwardSelection[item.id] || isRowBusy(item.id)"
              :loading="forwardingIds.has(item.id)"
              @click="handleForward(item.id)"
            >
              Encaminhar
            </Button>
          </div>
          <p v-else-if="item.kind === 'PATIENT' && item.status === 'FORWARDED'" class="mt-4 border-t border-border pt-4 text-body-sm text-text-muted">
            Encaminhado — lead #{{ item.forwardedLead }} criado.
          </p>
          <p v-else-if="item.kind === 'PATIENT'" class="mt-4 border-t border-border pt-4 text-body-sm text-text-muted">
            Encerrado — sem encaminhamento.
          </p>

          <!-- Interesse de terapeuta: acompanhamento + onboarding (criar conta -> criar perfil). Encerrado é terminal — sem botões, só o indicador. -->
          <div v-else-if="item.status !== 'CLOSED'" class="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <template v-if="accountCreatedIds.has(item.id)">
              <span class="text-body-sm text-success">Conta de acesso disponível.</span>
              <span v-if="emailSentIds.has(item.id)" role="status" class="text-body-sm text-success">Pedido de envio do e-mail de definição de senha aceito.</span>
              <p v-if="emailErrors.has(item.id)" role="alert" class="text-body-sm text-error">{{ emailErrors.get(item.id) }}</p>
              <Button size="sm" variant="secondary" :disabled="isRowBusy(item.id)" :loading="accountCreatingIds.has(item.id)" @click="resendAccessEmail(item.id, item.email)">
                {{ emailSentIds.has(item.id) ? 'Reenviar e-mail de acesso' : 'Enviar e-mail de acesso' }}
              </Button>
              <RouterLink :to="newProfessionalLink(item)" class="text-body-sm text-primary-600 underline">Criar perfil profissional →</RouterLink>
            </template>
            <Button
              v-else
              size="sm"
              :disabled="isRowBusy(item.id)"
              :loading="accountCreatingIds.has(item.id)"
              @click="handleCreateAccount(item.id, item.email)"
            >
              Criar conta de acesso
            </Button>
            <Button v-if="!accountCreatedIds.has(item.id)" size="sm" variant="secondary" :disabled="isRowBusy(item.id)" @click="resumeAccessAccount(item.id, item.email)">
              Já tem conta? Retomar
            </Button>
            <Button
              v-if="item.status === 'NEW'"
              size="sm"
              variant="secondary"
              :disabled="isRowBusy(item.id)"
              :loading="statusChangingIds.has(item.id)"
              @click="handleSetStatus(item.id, 'IN_PROGRESS')"
            >
              Marcar em acompanhamento
            </Button>
            <Button
              size="sm"
              variant="ghost"
              :disabled="isRowBusy(item.id)"
              :loading="statusChangingIds.has(item.id)"
              @click="handleSetStatus(item.id, 'CLOSED')"
            >
              Encerrar
            </Button>
          </div>
          <p v-else class="mt-4 border-t border-border pt-4 text-body-sm text-text-muted">Encerrado.</p>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>
  </div>
</template>
