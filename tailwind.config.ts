import type { Config } from 'tailwindcss';
import { brand } from './lib/constants';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        truth: brand.colors.truth,
        dark: brand.colors.dark,
        light: brand.colors.light,
        gray: brand.colors.gray,
      },
      fontFamily: {
        sans: [brand.font.family],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      boxShadow: {
        glow: '0 0 40px rgba(255, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
