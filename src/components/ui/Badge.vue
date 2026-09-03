<script setup lang="ts">
type Variant = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type Size = 'sm' | 'md';

const props = withDefaults(defineProps<{ variant?: Variant; size?: Size }>(), {
  variant: 'neutral',
  size: 'md',
});

const variantClasses: Record<Variant, string> = {
  neutral: 'bg-surface-sunken text-text-muted',
  primary: 'bg-primary-50 text-primary-700',
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
