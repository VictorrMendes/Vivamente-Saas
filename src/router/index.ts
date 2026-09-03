import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/Login/LoginPage.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/pages/Dashboard/DashboardPage.vue') },
        { path: 'agenda', name: 'agenda', component: () => import('@/pages/Agenda/AgendaPage.vue') },
        { path: 'leads', name: 'leads', component: () => import('@/pages/Leads/LeadsPage.vue') },
        { path: 'leads/:id', name: 'lead-detail', component: () => import('@/pages/Leads/LeadDetailPage.vue'), props: true },
        { path: 'clientes', name: 'clientes', component: () => import('@/pages/Clientes/ClientesPage.vue') },
        { path: 'clientes/:id', name: 'cliente-detail', component: () => import('@/pages/Clientes/ClienteDetailPage.vue'), props: true },
        { path: 'servicos', name: 'servicos', component: () => import('@/pages/Servicos/ServicosPage.vue') },
        {
          path: 'profissionais',
          name: 'profissionais',
          component: () => import('@/pages/Profissionais/ProfissionaisPage.vue'),
          meta: { roles: ['ADMIN'] },
        },
        {
          path: 'profissionais/:id',
          name: 'profissional-detail',
          component: () => import('@/pages/Profissionais/ProfissionalDetailPage.vue'),
          props: true,
          meta: { roles: ['ADMIN'] },
        },
        {
          path: 'minha-pagina',
          name: 'minha-pagina',
          component: () => import('@/pages/MinhaPagina/MinhaPaginaPage.vue'),
          meta: { roles: ['THERAPIST'] },
        },
        { path: 'notificacoes', name: 'notificacoes', component: () => import('@/pages/Notificacoes/NotificacoesPage.vue') },
        { path: 'configuracoes', name: 'configuracoes', component: () => import('@/pages/Configuracoes/ConfiguracoesPage.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }

  if (to.meta.roles && auth.role && !to.meta.roles.includes(auth.role)) {
    return { name: 'dashboard' };
  }
});

export { router };
