import { defineConfig } from 'vitest/config';

// `base: './'` genera rutas relativas: el mismo build funciona en la raíz de un
// dominio (Netlify, Vercel, Cloudflare Pages) o en un subdirectorio (GitHub Pages).
// Se puede forzar otro valor con la variable BASE_PATH si algún hosting lo requiere.
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
