// @ts-check
/**
 * Fails when *.table.ts changed but no migration was generated: runs
 * `drizzle-kit generate` into a temporary copy of drizzle/ and checks that
 * no new migration appears. Works offline — no database needed.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'

const MIGRATIONS = 'drizzle'
// Must be relative: drizzle-kit prefixes `out` with "./".
const COPY = 'node_modules/.tmp/migrations-check'

/** @param {string} directory */
const countMigrations = (directory) =>
  readdirSync(directory).filter((file) => file.endsWith('.sql')).length

rmSync(COPY, { recursive: true, force: true })
mkdirSync(COPY, { recursive: true })

try {
  cpSync(MIGRATIONS, COPY, { recursive: true })
  const before = countMigrations(COPY)

  execFileSync('npx', ['drizzle-kit', 'generate'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, DRIZZLE_OUT: COPY },
  })

  if (countMigrations(COPY) !== before) {
    console.error(
      '✖ Database schema changed without a migration. Run `npm run db:generate` and commit it.'
    )
    process.exit(1)
  }
} finally {
  rmSync(COPY, { recursive: true, force: true })
}
