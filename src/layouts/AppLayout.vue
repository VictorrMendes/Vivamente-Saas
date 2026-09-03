<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, RouterLink, useRouter } from 'vue-router';
import {
  LayoutDashboard,
  CalendarDays,
  UserPlus,
  Users,
  Briefcase,
  UserCog,
  FileEdit,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/types/auth';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/leads', label: 'Leads', icon: UserPlus },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicos', label: 'Serviços', icon: Briefcase },
  { to: '/profissionais', label: 'Profissionais', icon: UserCog, roles: ['ADMIN'] },
  { to: '/minha-pagina', label: 'Minha Página', icon: FileEdit, roles: ['THERAPIST'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

const auth = useAuthStore();
const router = useRouter();

const visibleNavItems = computed(() =>
  navItems.filter((item) => !item.roles || (auth.role && item.roles.includes(auth.role))),
);

async function handleLogout() {
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-screen bg-background">
    <aside class="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div class="flex h-16 items-center border-b border-border px-6">
        <span class="font-display text-h6 text-primary-700">VivaMente</span>
      </div>

      <nav class="flex-1 space-y-1 px-3 py-4" aria-label="Navegação principal">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-body-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          active-class="bg-primary-50 font-medium text-primary-700 hover:bg-primary-50 hover:text-primary-700"
        >
          <component :is="item.icon" :size="18" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="border-t border-border px-3 py-4">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-body-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          @click="handleLogout"
        >
          <LogOut :size="18" aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>

    <div class="flex flex-1 flex-col">
      <header class="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
        <p class="text-body-sm text-text-muted">
          Olá, <span class="font-medium text-text">{{ auth.user?.email }}</span>
        </p>
        <RouterLink
          to="/notificacoes"
          class="rounded-md p-2 text-text-muted hover:bg-surface-sunken hover:text-text"
          aria-label="Notificações"
        >
          <Bell :size="20" aria-hidden="true" />
        </RouterLink>
      </header>

      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
