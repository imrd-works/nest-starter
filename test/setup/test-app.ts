import 'reflect-metadata'

import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { sql } from 'drizzle-orm'
import { inject } from 'vitest'

import { createApp } from '../../src/app/app.factory.js'
import { DATABASE, type Database } from '../../src/core/database/index.js'

export const TEST_JWT_SECRET = 'test-secret-that-is-long-enough-1234567890'

export interface TestAppOptions {
  env?: Record<string, string>
}

/** Boots the real application (same factory as production) against the e2e database. */
export async function createTestApp({
  env = {},
}: TestAppOptions = {}): Promise<NestFastifyApplication> {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: inject('databaseUrl'),
    JWT_SECRET: TEST_JWT_SECRET,
    SWAGGER_ENABLED: 'true',
    THROTTLE_LIMIT: '1000',
    ...env,
  })

  const app = await createApp()
  await app.init()
  await app.getHttpAdapter().getInstance().ready()
  return app
}

let clientCounter = 0

/**
 * A distinct client IP for `app.inject({ ...uniqueClient() })`: rate limits are per IP,
 * so independent tests must not share one budget.
 */
export function uniqueClient(): { remoteAddress: string } {
  clientCounter += 1
  return {
    remoteAddress: `10.0.${String(Math.floor(clientCounter / 250))}.${String((clientCounter % 250) + 1)}`,
  }
}

export async function resetDatabase(app: NestFastifyApplication): Promise<void> {
  const db = app.get<Database>(DATABASE)
  await db.execute(sql`truncate table users, contact_messages restart identity cascade`)
}
