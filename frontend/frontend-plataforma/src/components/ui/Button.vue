<script setup lang="ts">
import { computed } from 'vue';
import { Loader2 } from '@lucide/vue';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'primary', size: 'md', loading: false, disabled: false, type: 'button' },
);

const heightText: Record<Size, string> = {
  sm: 'h-8 text-body-sm gap-1.5',
  md: 'h-10 text-button gap-2',
  lg: 'h-12 text-button gap-2',
};

const padding: Record<Size, string> = { sm: 'px-3', md: 'px-4', lg: 'px-6' };

const variantColor: Record<Variant, string> = {
  primary: 'bg-primary-600 text-text-inverse hover:bg-primary-700 active:bg-primary-700',
  secondary: 'bg-secondary-500 text-text-inverse hover:bg-secondary-600 active:bg-secondary-600',
  ghost: 'bg-transparent text-text hover:bg-surface-sunken active:bg-surface-sunken',
  destructive: 'bg-error text-text-inverse hover:opacity-90 active:opacity-90',
  link: 'bg-transparent text-primary-600 hover:underline underline-offset-4',
};

const classes = computed(() => [
  heightText[props.size],
  props.variant === 'link' ? '' : padding[props.size],
  variantColor[props.variant],
]);

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading"
    class="relative inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="classes"
  >
    <span class="inline-flex items-center gap-2" :class="{ invisible: loading }">
      <slot />
    </span>
    <Loader2 v-if="loading" class="absolute animate-spin" :size="16" aria-hidden="true" />
  </button>
</template>
