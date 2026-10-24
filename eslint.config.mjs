// ESLint (flat config) para todo el monorepo: slides/, demo/ y scripts/.
// El formato lo decide Prettier (.prettierrc.json); aquí solo reglas de calidad.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '.firebase/**', 'docs/traces/**', '**/public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['slides/src/**/*.ts', 'demo/src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    rules: {
      // El código usa `cond ? a() : b()` y `(e.preventDefault(), go())` como sentencias cortas.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    // Los scripts de Playwright mandan funciones al navegador (page.waitForFunction).
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['**/vite.config.ts', 'eslint.config.mjs'],
    languageOptions: { globals: globals.node },
  },
);
