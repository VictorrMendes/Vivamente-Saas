import { reactive, readonly } from 'vue';

export interface ToastAction { label: string; to: string }
export interface Toast { id: number; kind: 'error' | 'success' | 'info'; message: string; action?: ToastAction }

const MAX_VISIBLE = 4;
const DURATION_MS = { error: 9000, success: 5000, info: 5000 } as const;

// Estado no escopo do módulo: um único host (App.vue) mostra os toasts de
// qualquer tela, inclusive das rotas públicas.
const items = reactive<Toast[]>([]);
let nextId = 1;

export function dismissToast(id: number) {
  const index = items.findIndex((toast) => toast.id === id);
  if (index !== -1) items.splice(index, 1);
}

export function showToast(kind: Toast['kind'], message: string, action?: ToastAction) {
  // Mesma mensagem já na tela (ex.: clique repetido) não empilha.
  if (items.some((toast) => toast.kind === kind && toast.message === message)) return;
  const id = nextId++;
  items.push({ id, kind, message, action });
  if (items.length > MAX_VISIBLE) items.splice(0, items.length - MAX_VISIBLE);
  setTimeout(() => dismissToast(id), DURATION_MS[kind]);
}

export function useToast() {
  return {
    toasts: readonly(items),
    dismiss: dismissToast,
    error: (message: string, action?: ToastAction) => showToast('error', message, action),
    success: (message: string) => showToast('success', message),
    info: (message: string) => showToast('info', message),
  };
}
