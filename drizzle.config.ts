import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile()
} catch {
  // No .env file — rely on the real environment.
}

export default defineConfig({
  dialect: 'postgresql',
  // Tables live next to their module: src/modules/<module>/*.table.ts
  schema: './src/modules/*/*.table.ts',
  // DRIZZLE_OUT is used by scripts/check-migrations.mjs to generate into a temp copy.
  out: process.env['DRIZZLE_OUT'] ?? './drizzle',
  // Must match createDatabase(): camelCase in TS ⇄ snake_case in SQL.
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: { url: process.env['DATABASE_URL'] ?? '' },
})
