const { fontFamily } = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    'views/**/*.{html,ejs}',
    'src/frontend/**/*.{js,jsx,ts,tsx}',
    'src/webapp/**/*.{js,jsx,ts,tsx}',
    'src/react/**/*.{js,jsx,ts,tsx}',
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    'w-64',
    'w-1/2',
    'w-11/12',
    'w-11',
    'rounded-l-lg',
    'rounded-r-lg',
    'bg-gray-200',
    'grid-cols-4',
    'grid-cols-7',
    'h-6',
    'leading-6',
    'h-9',
    'leading-9',
    'shadow-lg',
    'bg-opacity-50',
    'dark:bg-opacity-80',
    'max-w-xl',
    'opacity-70',
    'hidden',
    'm-auto',
    'animate-spin',
    'text-red-600',
    'py-16',
    'text-xs',
    'font-bold',
    'py-6',
    'w-28',
    'shadow-md',
    'shadow-xl',
    'gap-4',
    'text-blue',
  ],
  important: true,
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      spacing: {
        13: '52px',
        15: '60px',
        17: '68px',
        18: '72px',
        19: '76px',
        21: '84px',
        22: '88px',
        23: '92px',
        25: '100px',
        26: '104px',
        27: '108px',
        29: '116px',
        30: '120px',
        31: '124px',
        33: '132px',
        34: '136px',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // Base Tailwind colors
        transparent: 'transparent',
        current: 'currentColor',
        black: colors.black,
        white: colors.white,
        gray: colors.gray,
        emerald: colors.emerald,
        indigo: colors.indigo,
        yellow: colors.yellow,

        // Custom colors
        'success-green': '#45C9A9',
        grey: '#e8e8e8',
        'primary-pink': '#f35063',
        'light-black': '#030229',
        'v2-gray-light': '#E6E6E6',
        'v2-gray-dark': '#424242',
        'v2-gray-darker': '#242424',
        'v2-blue': '#3C89F9',
        'smyth-dark': '#242424',
        'smyth-light': '#C7C7C7',
        'smyth-blue': '#1355B6',
        'smyth-red': '#C50F1F',
        'smyth-white': '#F5F5F5',
        // primary: '#f35063',

        primary: {
          50: '#eff6ff',

          100: '#45C9A9',

          200: '#bfdbfe',

          300: '#93c5fd',

          400: '#60a5fa',

          500: '#3b82f6',

          600: '#2563eb',

          700: '#f35063',

          800: '#1e40af',

          900: '#1e3a8a',
        },

        uipink: '#f35063',

        /* Even though 'success-green' and 'primary-100' have the same color right now,

                it's smarter to go with 'smyth-green' when registering because it gives us the option to include more shades of green in the future.

                On the other hand, 'primary' includes a mix of shades including red, green, and blue.*/

        'smyth-emerald': {
          400: '#45C9A9',
        },

        'smyth-red': {
          500: '#f35063',
        },

        'smyth-amber': {
          500: '#FF8035',
        },

        //New Design Colors Since July 31st, 2024

        'smythos-black': '#000000',

        'smythos-white': '#FFFFFF',

        'smythos-accent-lavender': '#6577F3',

        'smythos-accent-purple': '#7C4FFF',

        'smythos-accent-yellow': '#FECB4D',

        'smythos-accent-lightblue': '#1EA5FC',

        'smythos-accent-pink': '#EE80E6',

        'smythos-green': {
          50: '#ECFAF6',

          100: '#C5EEE4',

          200: '#A9E6D7',

          300: '#82DBC5',

          400: '#6AD4BA',

          500: '#45C9A9',

          600: '#3FB79A',

          700: '#318F78',

          800: '#266F5D',

          900: '#1D5447',
        },

        'smythos-blue': {
          50: '#EBF3FE',
          100: '#C2D8FC',
          200: '#A5C6FB',
          300: '#7CABF9',
          400: '#629BF8',
          500: '#3B82F6',
          600: '#3676E0',
          700: '#2A5CAF',
          800: '#204887',
          900: '#193767',
        },
        // primary: {
        //   DEFAULT: 'hsl(var(--primary))',
        //   foreground: 'hsl(var(--primary-foreground))',
        // },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
          ...fontFamily.sans,
        ],
        body: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      textDecoration: ['active'],
      minWidth: {
        kanban: '28rem',
      },
      transitionDelay: {
        3000: '3000ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('flowbite/plugin')],
};
