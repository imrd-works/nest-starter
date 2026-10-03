import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// SWC keeps decorator metadata, which NestJS dependency injection needs (esbuild drops it).
export default defineConfig({
  // Inline projects inherit this plugin (Vitest 5), no need to repeat it per project.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e.test.ts'],
          environment: 'node',
          globalSetup: ['test/setup/global-setup.ts'],
          // One app + one database for all e2e files: run them sequentially.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // CLI entry points are exercised by CI steps (build, openapi:check, migrations), not unit tests.
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/app/{main,openapi,migrate,seed}.ts'],
      // Ratchet: raise these when coverage grows, never lower them.
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
})
