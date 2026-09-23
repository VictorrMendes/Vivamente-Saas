<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterView, RouterLink, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  CalendarDays,
  UserPlus,
  Users,
  Briefcase,
  UserCog,
  FileEdit,
  Package,
  Wallet,
  Bell,
  Settings,
  Menu,
  Inbox,
  LogOut,
  type LucideIcon,
} from '@lucide/vue';
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, VisuallyHidden } from 'reka-ui';
import { useAuthStore } from '@/stores/auth';
import { useMyPublicProfile } from '@/composables/useMyPublicProfile';
import type { UserRole } from '@/types/auth';
import SidebarNav from '@/components/layout/SidebarNav.vue';
import SidebarProfile from '@/components/layout/SidebarProfile.vue';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/leads', label: 'Leads', icon: UserPlus },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicos', label: 'Serviços', icon: Briefcase },
  { to: '/institucional', label: 'Institucional', icon: Inbox, roles: ['ADMIN'] },
  { to: '/profissionais', label: 'Profissionais', icon: UserCog, roles: ['ADMIN'] },
  { to: '/pacotes', label: 'Pacotes', icon: Package },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/minha-pagina', label: 'Minha Página', icon: FileEdit, roles: ['THERAPIST'] },
  { to: '/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

const auth = useAuthStore();
const router = useRouter();
const mobileNavOpen = ref(false);
const areaLabel = computed(() => auth.role === 'ADMIN' ? 'Área administrativa' : 'Área do terapeuta');

const visibleNavItems = computed(() =>
  navItems
    .filter((item) => !item.roles || (auth.role && item.roles.includes(auth.role)))
    .map((item, index) => ({ ...item, number: String(index + 1).padStart(2, '0') })),
);

// O User da conta não tem campo de nome (só e-mail) - o nome de verdade só
// existe no Professional, e só pra THERAPIST. Busca uma vez aqui (raiz do
// shell autenticado) e repassa pro header e pro SidebarProfile (2 instâncias:
// mobile e desktop), em vez de cada um buscar por conta própria.
const { profile: myProfile, load: loadMyProfile } = useMyPublicProfile();
onMounted(() => {
  if (auth.role === 'THERAPIST') loadMyProfile();
});
const displayName = computed(() => (auth.role === 'THERAPIST' ? myProfile.value?.fullName : null) || auth.user?.email || '');

async function handleLogout() {
  await auth.logout();
  mobileNavOpen.value = false;
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <aside class="sidebar-dark sticky top-0 hidden h-dvh w-64 shrink-0 flex-col rounded-r-3xl bg-primary-900 lg:flex">
      <div class="flex h-16 shrink-0 items-center gap-2 px-6">
        <span class="font-display text-h6 tracking-tight text-text-inverse">VivaMente</span>
      </div>
      <SidebarNav :items="visibleNavItems" />
      <SidebarProfile :display-name="displayName" @logout="handleLogout" />
    </aside>

    <DialogRoot v-model:open="mobileNavOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-black/50 lg:hidden" />
        <DialogContent
          class="sidebar-dark fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary-900 focus:outline-none lg:hidden"
        >
          <VisuallyHidden as-child>
            <DialogTitle>Menu de navegação</DialogTitle>
          </VisuallyHidden>
          <div class="flex h-16 shrink-0 items-center justify-between px-6">
            <span class="font-display text-h6 tracking-tight text-text-inverse">VivaMente</span>
            <button
              type="button"
              class="rounded-md p-1.5 text-primary-200 hover:bg-primary-800 hover:text-text-inverse"
              aria-label="Fechar menu"
              @click="mobileNavOpen = false"
            >
              <Menu :size="20" aria-hidden="true" />
            </button>
          </div>
          <SidebarNav :items="visibleNavItems" @navigate="mobileNavOpen = false" />
          <SidebarProfile :display-name="displayName" @logout="handleLogout" />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2 lg:gap-3 lg:px-6">
        <button
          type="button"
          class="rounded-md p-1.5 text-text-muted hover:bg-surface-sunken hover:text-text lg:hidden"
          aria-label="Abrir menu"
          @click="mobileNavOpen = true"
        >
          <Menu :size="22" aria-hidden="true" />
        </button>
        <div class="min-w-0 shrink-0">
          <span class="block font-display text-body font-medium text-primary-700 lg:hidden">VivaMente</span>
          <span class="text-caption font-medium text-primary-700">{{ areaLabel }}</span>
        </div>

        <div class="ml-auto flex items-center gap-3">
          <p class="hidden min-w-0 truncate text-body-sm text-text-muted xl:block">
            Olá, <span class="font-medium text-text">{{ displayName }}</span>
          </p>
          <RouterLink
            to="/notificacoes"
            class="rounded-md p-2 text-text-muted hover:bg-surface-sunken hover:text-text"
            aria-label="Notificações"
          >
            <Bell :size="20" aria-hidden="true" />
          </RouterLink>
          <button
            type="button"
            class="flex shrink-0 items-center gap-1.5 rounded-md p-2 text-body-sm text-text-muted hover:bg-surface-sunken hover:text-text"
            aria-label="Sair da conta"
            @click="handleLogout"
          >
            <LogOut :size="18" aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/*
 * A sidebar tem fundo escuro fixo (marca), independente do tema do sistema.
 * --color-primary-700 e --color-text-inverse trocam de valor no dark mode
 * (pra funcionar em fundos claros que também trocam) — combinados com um
 * fundo que NUNCA muda, isso vira texto escuro em fundo escuro. Fixamos os
 * dois no valor de tema claro (mesmo valor de tokens.css) só nesta área.
 * CSS vars atravessam fronteira de componente normalmente, então isso
 * também corrige SidebarNav e SidebarProfile sem tocar neles.
 */
.sidebar-dark {
  --color-primary-700: #17423a;
  --color-text-inverse: #f3f6f4;
}
</style>
