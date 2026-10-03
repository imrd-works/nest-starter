import { HealthIndicatorService } from '@nestjs/terminus'
import { describe, expect, it, vi } from 'vitest'

import type { Database } from '../database/index.js'

import { DatabaseHealthIndicator } from './database.health.js'

function createIndicator(execute: () => Promise<unknown>) {
  const db = { execute: vi.fn(execute) } as unknown as Database
  return new DatabaseHealthIndicator(db, new HealthIndicatorService())
}

describe('DatabaseHealthIndicator', () => {
  it('reports up when the database answers', async () => {
    const indicator = createIndicator(() => Promise.resolve({ rows: [] }))

    await expect(indicator.check()).resolves.toEqual({ database: { status: 'up' } })
  })

  it('reports down with the reason when the database is unreachable', async () => {
    const indicator = createIndicator(() => Promise.reject(new Error('ECONNREFUSED')))

    await expect(indicator.check('db')).resolves.toEqual({
      db: { status: 'down', message: 'ECONNREFUSED' },
    })
  })

  it('does not leak non-Error rejection values', async () => {
    const indicator = createIndicator(() => Promise.reject(new Error('boom', { cause: 'secret' })))
    const failing = createIndicator(() => Promise.reject(Object.create(null) as Error))

    await expect(indicator.check()).resolves.toMatchObject({ database: { status: 'down' } })
    await expect(failing.check()).resolves.toEqual({
      database: { status: 'down', message: 'unreachable' },
    })
  })
})
