import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const dir = import.meta.dirname;

// Deck (/) + consola de la presentadora (/presenter/) + app de asistentes (/live/)
export default defineConfig({
  server: {
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**'],
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        deck: resolve(dir, 'index.html'),
        presenter: resolve(dir, 'presenter/index.html'),
        live: resolve(dir, 'live/index.html'),
      },
    },
  },
});
