import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createTestApp, resetDatabase } from '../setup/test-app.js'

describe('contacts (e2e)', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    app = await createTestApp()
    await resetDatabase(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('accepts a valid public message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      payload: { email: 'user@example.com', message: 'Hello, I have a question' },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/) })
  })

  it('trims and validates the message length', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      payload: { email: 'user@example.com', message: '   short    ' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      details: [expect.objectContaining({ path: 'message' })],
    })
  })
})
