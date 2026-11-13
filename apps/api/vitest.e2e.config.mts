import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Os e2e sobem o AppModule inteiro e usam o banco de DATABASE_URL.
// Localmente as variáveis vêm do .env da raiz; na CI elas já estão no ambiente
// (loadEnvFile não sobrescreve variáveis que já existem).
const envDaRaiz = resolve(import.meta.dirname, '../../.env');
if (existsSync(envDaRaiz)) process.loadEnvFile(envDaRaiz);

export default defineConfig({
  // A injeção de dependências do Nest precisa dos metadados de decorators,
  // que o esbuild padrão do Vitest não emite. O SWC emite.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    restoreMocks: true,
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
