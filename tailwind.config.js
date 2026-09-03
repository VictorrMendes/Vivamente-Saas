import preset from '@vivamente/design/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
};
