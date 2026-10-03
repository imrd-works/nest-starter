import { loadConfig } from '../core/config/index.js'
import { createDatabase, createPool, runMigrations } from '../core/database/index.js'

/** Production migrations: `node dist/app/migrate.js` (release step / init container). */
try {
  process.loadEnvFile()
} catch {
  // No .env file — rely on the real environment.
}

const config = loadConfig()
const pool = createPool(config.database.url, 1)

try {
  await runMigrations(createDatabase(pool))
  console.log('Migrations applied')
} finally {
  await pool.end()
}
