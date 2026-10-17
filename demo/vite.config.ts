import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const dir = import.meta.dirname;

// Mercadito (/) + comparación roto vs arreglado (/compare.html)
export default defineConfig({
  appType: 'spa',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { main: resolve(dir, 'index.html'), compare: resolve(dir, 'compare.html') },
    },
  },
});
