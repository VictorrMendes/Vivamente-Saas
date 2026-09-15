<script setup lang="ts">
type Variant = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type Size = 'sm' | 'md';

const props = withDefaults(defineProps<{ variant?: Variant; size?: Size }>(), {
  variant: 'neutral',
  size: 'md',
});

// primary/secondary usam bg-surface-sunken (não um tom -50 fixo): só
// primary-700/secondary-600 têm par redefinido pro tema escuro em tokens.css
// (--color-primary-50 e --color-secondary-700 não têm variante dark, então
// combinados ficavam claro-sobre-claro no dark mode — texto ilegível).
const variantClasses: Record<Variant, string> = {
  neutral: 'bg-surface-sunken text-text-muted',
  primary: 'bg-surface-sunken text-primary-700',
  secondary: 'bg-surface-sunken text-secondary-600',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-error-bg text-error',
  info: 'bg-info-bg text-info',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-caption',
  md: 'px-2.5 py-1 text-body-sm',
};
</script>

<template>
  <span
    class="inline-flex items-center rounded-pill font-medium"
    :class="[variantClasses[props.variant], sizeClasses[props.size]]"
  >
    <slot />
  </span>
</template>
