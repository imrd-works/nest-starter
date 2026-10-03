import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { TestProject } from 'vitest/node'

import { createDatabase, createPool, runMigrations } from '../../src/core/database/index.js'

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string
  }
}

// Keep the major version in sync with docker-compose.yml and production.
const POSTGRES_IMAGE = process.env['TEST_POSTGRES_IMAGE'] ?? 'postgres:18-alpine'

let container: StartedPostgreSqlContainer | undefined

/** One real PostgreSQL for the whole e2e run, migrated exactly like production. */
export async function setup(project: TestProject): Promise<void> {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start()
  const databaseUrl = container.getConnectionUri()

  const pool = createPool(databaseUrl, 1)
  try {
    await runMigrations(createDatabase(pool))
  } finally {
    await pool.end()
  }

  project.provide('databaseUrl', databaseUrl)
}

export async function teardown(): Promise<void> {
  await container?.stop()
}
