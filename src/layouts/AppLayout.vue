<script setup lang="ts">
import { computed, ref } from 'vue';
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
  type LucideIcon,
} from '@lucide/vue';
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, VisuallyHidden } from 'reka-ui';
import { useAuthStore } from '@/stores/auth';
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

const visibleNavItems = computed(() =>
  navItems
    .filter((item) => !item.roles || (auth.role && item.roles.includes(auth.role)))
    .map((item, index) => ({ ...item, number: String(index + 1).padStart(2, '0') })),
);

async function handleLogout() {
  await auth.logout();
  mobileNavOpen.value = false;
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <aside class="sidebar-dark hidden w-64 shrink-0 flex-col rounded-r-3xl bg-primary-900 lg:flex">
      <div class="flex h-16 items-center gap-2 px-6">
        <span class="font-display text-h6 tracking-tight text-text-inverse">VivaMente</span>
      </div>
      <SidebarNav :items="visibleNavItems" />
      <SidebarProfile @logout="handleLogout" />
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
          <div class="flex h-16 items-center justify-between px-6">
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
          <SidebarProfile @logout="handleLogout" />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
        <button
          type="button"
          class="rounded-md p-1.5 text-text-muted hover:bg-surface-sunken hover:text-text lg:hidden"
          aria-label="Abrir menu"
          @click="mobileNavOpen = true"
        >
          <Menu :size="22" aria-hidden="true" />
        </button>
        <span class="font-display text-h6 text-primary-700 lg:hidden">VivaMente</span>

        <div class="ml-auto flex items-center gap-3">
          <p class="hidden text-body-sm text-text-muted sm:block">
            Olá, <span class="font-medium text-text">{{ auth.user?.email }}</span>
          </p>
          <RouterLink
            to="/notificacoes"
            class="rounded-md p-2 text-text-muted hover:bg-surface-sunken hover:text-text"
            aria-label="Notificações"
          >
            <Bell :size="20" aria-hidden="true" />
          </RouterLink>
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
