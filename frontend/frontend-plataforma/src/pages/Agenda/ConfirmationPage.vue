<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';
import { formatDateTime } from '@/lib/datetime';
import Button from '@/components/ui/Button.vue';

interface Preview { startsAt: string; endsAt: string; professionalName: string; status: string }
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
const data = ref<Preview | null>(null);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const done = ref(false);
async function respond(decision: 'confirm' | 'decline') {
  busy.value = true;
  error.value = '';
  try {
    const response = await backApi<ApiEnvelope<Preview>>('/api/v1/public/appointment-confirmations/respond', {
      method: 'POST', auth: false, body: JSON.stringify({ token, decision }),
    });
    data.value = response.data;
    done.value = true;
    history.replaceState(history.state, '', window.location.pathname);
  } catch { error.value = 'Não foi possível registrar sua resposta. O link pode ter expirado ou já ter sido respondido. Contate o profissional.'; }
  finally { busy.value = false; }
}
onMounted(async () => {
  try {
    const response = await backApi<ApiEnvelope<Preview>>('/api/v1/public/appointment-confirmations/preview', {
      method: 'POST', auth: false, body: JSON.stringify({ token }),
    });
    data.value = response.data;
  } catch { error.value = 'Link inválido, expirado ou já respondido. Solicite um novo link ao profissional.'; }
  finally { loading.value = false; }
});
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-background p-4">
    <section class="w-full max-w-md space-y-5 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <p class="font-display text-h6 text-primary-700">VivaMente</p>
      <h1 class="font-display text-h4 text-text">Confirmação de horário</h1>
      <p v-if="loading" role="status">Carregando seu horário…</p>
      <p v-if="error" role="alert" class="text-body-sm text-error">{{ error }}</p>
      <template v-if="data">
        <p class="text-text">{{ data.professionalName }}</p>
        <p class="text-body-sm text-text-muted">{{ formatDateTime(data.startsAt) }}</p>
        <p v-if="done" role="status" class="rounded-xl bg-surface-sunken p-4 text-text">
          {{ data.status === 'CONFIRMED' ? 'Presença confirmada. Seu profissional já pode consultar sua resposta.' : 'Recusa registrada. Entre em contato com o profissional para combinar outro horário.' }}
        </p>
        <div v-else class="flex flex-wrap gap-3">
          <Button :loading="busy" :disabled="busy" @click="respond('confirm')">Confirmar presença</Button>
          <Button variant="secondary" :disabled="busy" @click="respond('decline')">Não poderei comparecer</Button>
        </div>
      </template>
    </section>
  </main>
</template>
