<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui';
import { Link2, Plus, X } from '@lucide/vue';
import { usePackages } from '@/composables/usePackages';
import { usePackagePlans } from '@/composables/usePackagePlans';
import { usePayments } from '@/composables/usePayments';
import { useServices } from '@/composables/useServices';
import { useToast } from '@/composables/useToast';
import { formatCurrency } from '@/lib/currency';
import { formatDate, toDateOnly } from '@/lib/datetime';
import type { NewPackagePlan, Package, PackageStatus } from '@/types/package';
import type { Payment } from '@/types/payment';
import PackagePlanForm from '@/components/forms/PackagePlanForm.vue';
import Button from '@/components/ui/Button.vue';

// Central do plano do cliente: acompanhar o plano ativo, atribuir um pacote do
// catálogo (ou criar um novo na hora) e gerar a cobrança/link de pagamento.
const props = defineProps<{ open: boolean; clientId: number; clientName: string }>();
const emit = defineEmits<{ 'update:open': [boolean]; changed: [] }>();

const toast = useToast();
const { packages, saving: pkgSaving, saveError: pkgError, load: loadPackages, update: updatePackage, assign } = usePackages();
const { plans, saving: planSaving, saveError: planError, load: loadPlans, create: createPlan } = usePackagePlans();
const { services, load: loadServices } = useServices();
const { payments, saving: paySaving, saveError: payError, create: createPayment } = usePayments();

type Tab = 'plano' | 'cobranca';
const tab = ref<Tab>('plano');

const activePackages = computed(() => packages.value.filter((p) => p.status === 'ACTIVE'));
const serviceName = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s.name]));
  return (id: number) => map.get(id) ?? 'Serviço removido';
});

// --- Atribuir plano ---
const selectedPlanId = ref<number | ''>('');
const startDate = ref(toDateOnly(new Date()));
const creatingPlan = ref(false);
const selectedPlan = computed(() => plans.value.find((p) => p.id === selectedPlanId.value));

async function handleAssign() {
  if (!selectedPlan.value) return;
  const assigned = await assign(props.clientId, selectedPlan.value.id, startDate.value || undefined);
  if (assigned) {
    toast.success(`Plano “${assigned.name}” atribuído a ${props.clientName}.`);
    selectedPlanId.value = '';
    emit('changed');
  }
}

async function handleCreatePlan(plan: NewPackagePlan) {
  const created = await createPlan(plan);
  if (created) {
    toast.success('Pacote criado e selecionado.');
    selectedPlanId.value = created.id;
    creatingPlan.value = false;
  }
}

async function changeStatus(pkg: Package, status: PackageStatus) {
  if (await updatePackage(pkg.id, { status })) {
    toast.success(status === 'COMPLETED' ? 'Plano concluído.' : 'Plano cancelado.');
    await loadPackages({ client: props.clientId, status: 'ACTIVE' });
    emit('changed');
  }
}

// --- Cobrança ---
const charge = ref({ amount: 0, dueDate: toDateOnly(new Date()), description: '' });
const chargeError = ref<string | null>(null);
const createdPayment = ref<Payment | null>(null);

function chargeFor(pkg: Package) {
  charge.value = { amount: pkg.totalValue, dueDate: toDateOnly(new Date()), description: `Plano ${pkg.name}` };
  createdPayment.value = null;
  chargeError.value = null;
  tab.value = 'cobranca';
}

async function submitCharge() {
  chargeError.value = null;
  if (!(charge.value.amount > 0)) { chargeError.value = 'Informe um valor maior que zero.'; return; }
  if (!charge.value.dueDate) { chargeError.value = 'Informe a data de vencimento.'; return; }
  const ok = await createPayment({
    client: props.clientId,
    amount: Number(charge.value.amount),
    dueDate: charge.value.dueDate,
    description: charge.value.description.trim() || undefined,
  });
  if (ok) {
    createdPayment.value = payments.value[payments.value.length - 1] ?? null;
    toast.success('Cobrança criada como pendente.');
  }
}

// Reabrir começa do zero: nada do uso anterior fica nos formulários.
watch(() => props.open, (open) => {
  if (!open) return;
  tab.value = 'plano';
  selectedPlanId.value = '';
  creatingPlan.value = false;
  startDate.value = toDateOnly(new Date());
  charge.value = { amount: 0, dueDate: toDateOnly(new Date()), description: '' };
  chargeError.value = null;
  createdPayment.value = null;
  loadPackages({ client: props.clientId, status: 'ACTIVE' });
  loadPlans();
  loadServices();
}, { immediate: true });

for (const errorRef of [pkgError, planError, payError]) {
  watch(errorRef, (message) => { if (message) toast.error(message); });
}

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600';
const labelClass = 'mb-1 block text-label uppercase tracking-label text-text-muted';
const tabs: { key: Tab; label: string }[] = [
  { key: 'plano', label: 'Plano' },
  { key: 'cobranca', label: 'Cobrança' },
];
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-lg focus:outline-none"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <DialogTitle class="font-display text-h6 text-text">Plano e pagamento</DialogTitle>
            <DialogDescription class="mt-1 text-body-sm text-text-muted">{{ clientName }}</DialogDescription>
          </div>
          <DialogClose class="rounded p-1 text-text-muted hover:text-text" aria-label="Fechar">
            <X :size="18" aria-hidden="true" />
          </DialogClose>
        </div>

        <div role="tablist" aria-label="Plano e cobrança" class="mt-4 flex gap-1 border-b border-border">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="tab === t.key"
            class="-mb-px border-b-2 px-4 py-2 text-body-sm font-medium transition-colors"
            :class="tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-text-muted hover:text-text'"
            @click="tab = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Plano -->
        <div v-show="tab === 'plano'" role="tabpanel" class="mt-5 space-y-6">
          <section aria-labelledby="active-plan-title">
            <h3 id="active-plan-title" class="mb-2 text-label uppercase tracking-label text-text-muted">Plano ativo</h3>
            <p v-if="activePackages.length === 0" class="rounded-md bg-surface-sunken px-3 py-3 text-body-sm text-text-muted">
              Este cliente não tem plano ativo. Atribua um pacote abaixo.
            </p>
            <ul v-else class="space-y-3">
              <li v-for="pkg in activePackages" :key="pkg.id" class="rounded-lg border border-border p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="font-medium text-text">{{ pkg.name }}</p>
                    <p class="text-body-sm text-text-muted">
                      <template v-if="pkg.service">{{ serviceName(pkg.service) }} · </template>{{ formatCurrency(pkg.totalValue) }}
                      <template v-if="pkg.expirationDate"> · válido até {{ formatDate(pkg.expirationDate) }}</template>
                    </p>
                  </div>
                  <p class="text-body-sm font-medium text-text">{{ pkg.remainingSessions }} de {{ pkg.totalSessions }} restantes</p>
                </div>
                <div
                  class="mt-3 h-2 overflow-hidden rounded-pill bg-surface-sunken"
                  role="progressbar"
                  :aria-valuenow="pkg.usedSessions"
                  aria-valuemin="0"
                  :aria-valuemax="pkg.totalSessions"
                  :aria-label="`${pkg.usedSessions} de ${pkg.totalSessions} sessões usadas`"
                >
                  <div class="h-full bg-primary-600" :style="{ width: `${Math.min(100, (pkg.usedSessions / pkg.totalSessions) * 100)}%` }" />
                </div>
                <div class="mt-3 flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" @click="chargeFor(pkg)"><Link2 :size="14" aria-hidden="true" />Gerar cobrança</Button>
                  <Button size="sm" variant="ghost" :disabled="pkgSaving" @click="changeStatus(pkg, 'COMPLETED')">Concluir plano</Button>
                  <Button size="sm" variant="ghost" :disabled="pkgSaving" @click="changeStatus(pkg, 'CANCELLED')"><span class="text-error">Cancelar plano</span></Button>
                </div>
              </li>
            </ul>
          </section>

          <section aria-labelledby="assign-plan-title">
            <div class="mb-2 flex items-center justify-between gap-2">
              <h3 id="assign-plan-title" class="text-label uppercase tracking-label text-text-muted">Atribuir pacote</h3>
              <button
                v-if="!creatingPlan"
                type="button"
                class="inline-flex items-center gap-1 text-body-sm text-primary-700 hover:underline"
                @click="creatingPlan = true"
              >
                <Plus :size="14" aria-hidden="true" />Criar novo pacote
              </button>
            </div>

            <div v-if="creatingPlan" class="rounded-lg border border-border bg-surface-sunken p-4">
              <PackagePlanForm :services="services" :saving="planSaving" submit-label="Criar pacote" @submit="handleCreatePlan" @cancel="creatingPlan = false" />
            </div>

            <template v-else>
              <p v-if="plans.length === 0" class="rounded-md bg-surface-sunken px-3 py-3 text-body-sm text-text-muted">
                Nenhum pacote no catálogo ainda. Crie o primeiro com “Criar novo pacote”.
              </p>
              <form v-else class="grid gap-3 sm:grid-cols-6" novalidate @submit.prevent="handleAssign">
                <div class="sm:col-span-4">
                  <label for="assign-plan" :class="labelClass">Pacote</label>
                  <select id="assign-plan" v-model="selectedPlanId" :class="inputClass">
                    <option value="" disabled>Selecione…</option>
                    <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }} — {{ p.totalSessions }} sessões · {{ formatCurrency(p.totalValue) }}</option>
                  </select>
                </div>
                <div class="sm:col-span-2">
                  <label for="assign-start" :class="labelClass">Início</label>
                  <input id="assign-start" v-model="startDate" type="date" :class="inputClass" />
                </div>
                <p v-if="selectedPlan" class="text-body-sm text-text-muted sm:col-span-6">
                  <template v-if="selectedPlan.service">{{ serviceName(selectedPlan.service) }} · </template>{{ formatCurrency(selectedPlan.totalValue / selectedPlan.totalSessions) }} por sessão
                  · {{ selectedPlan.validityDays ? `validade de ${selectedPlan.validityDays} dias` : 'sem prazo de validade' }}
                </p>
                <div class="sm:col-span-6">
                  <Button type="submit" size="sm" :disabled="!selectedPlan" :loading="pkgSaving">Atribuir a {{ clientName }}</Button>
                </div>
              </form>
            </template>
          </section>
        </div>

        <!-- Cobrança -->
        <div v-show="tab === 'cobranca'" role="tabpanel" class="mt-5">
          <form v-if="!createdPayment" class="space-y-4" novalidate @submit.prevent="submitCharge">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="pay-link-amount" :class="labelClass">Valor (R$)</label>
                <input id="pay-link-amount" v-model.number="charge.amount" type="number" min="0" step="0.01" required :class="inputClass" />
              </div>
              <div>
                <label for="pay-link-due" :class="labelClass">Vencimento</label>
                <input id="pay-link-due" v-model="charge.dueDate" type="date" required :class="inputClass" />
              </div>
            </div>
            <div>
              <label for="pay-link-desc" :class="labelClass">Descrição (opcional)</label>
              <input id="pay-link-desc" v-model="charge.description" type="text" maxlength="200" placeholder="Ex.: Plano 4 sessões" :class="inputClass" />
            </div>
            <p class="rounded-md bg-surface-sunken px-3 py-2 text-body-sm text-text-muted">
              A cobrança fica registrada como pendente no Financeiro. O link de pagamento será gerado quando a integração com o meio de pagamento estiver ativa.
            </p>
            <p v-if="chargeError" role="alert" class="text-body-sm text-error">{{ chargeError }}</p>
            <div class="flex justify-end">
              <Button type="submit" size="sm" :loading="paySaving"><Link2 :size="14" aria-hidden="true" />Gerar link de pagamento</Button>
            </div>
          </form>

          <div v-else class="space-y-4" role="status">
            <dl class="space-y-1 rounded-md bg-surface-sunken p-4 text-body-sm">
              <div class="flex justify-between gap-4"><dt class="text-text-muted">Valor</dt><dd class="font-medium text-text">{{ formatCurrency(createdPayment.amount) }}</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-text-muted">Vencimento</dt><dd class="text-text">{{ formatDate(createdPayment.dueDate) }}</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-text-muted">Recibo</dt><dd class="text-text">{{ createdPayment.receiptNumber }}</dd></div>
            </dl>
            <div>
              <p class="text-label uppercase tracking-label text-text-muted">Link de pagamento</p>
              <div class="mt-1 flex gap-2">
                <input type="text" disabled value="Disponível quando a integração for ativada" aria-label="Link de pagamento" :class="[inputClass, 'disabled:opacity-60']" />
                <Button variant="ghost" size="sm" disabled>Copiar</Button>
              </div>
            </div>
            <div class="flex flex-wrap justify-end gap-2">
              <RouterLink to="/financeiro" class="inline-flex h-8 items-center rounded-md px-3 text-body-sm text-primary-700 hover:underline" @click="emit('update:open', false)">Ver no Financeiro</RouterLink>
              <Button size="sm" @click="emit('update:open', false)">Concluir</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
