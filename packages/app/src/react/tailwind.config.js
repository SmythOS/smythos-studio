import preset from '../../scripts/build/shared/tailwind-v2.config';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
    '!./node_modules',
    '!./node_modules/**/*',
    '../webapp/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  presets: [preset],
};
