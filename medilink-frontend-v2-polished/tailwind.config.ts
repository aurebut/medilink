import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        stone: {
          50: '#FAFAF8',
          100: '#F5F5F0',
          200: '#E7E5E0',
          300: '#D6D3CD',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
        teal: {
          800: '#134E4A',
          900: '#0F4C5C',
          950: '#0A2E38',
        },
      },
    },
  },
  plugins: [],
};

export default config;
