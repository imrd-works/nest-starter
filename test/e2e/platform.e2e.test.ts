import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createTestApp } from '../setup/test-app.js'

describe('platform (e2e)', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    app = await createTestApp({
      env: { THROTTLE_LIMIT: '3', CORS_ORIGINS: 'https://app.example.com' },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('serves health probes outside the API prefix without auth', async () => {
    const live = await app.inject({ method: 'GET', url: '/health/live' })
    const ready = await app.inject({ method: 'GET', url: '/health/ready' })

    expect(live.statusCode).toBe(200)
    expect(ready.statusCode).toBe(200)
    expect(ready.json()).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } })
  })

  it('returns the unified error shape with a request id for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/nope' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      requestId: response.headers['x-request-id'],
    })
  })

  it('reuses an incoming x-request-id for tracing across services', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'trace-123' },
    })

    expect(response.headers['x-request-id']).toBe('trace-123')
  })

  it('replaces unsafe incoming request ids', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'bad id with spaces' },
    })

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects malformed JSON with 400 instead of 500', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      headers: { 'content-type': 'application/json' },
      payload: '{"email": ',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ statusCode: 400, error: 'Bad Request' })
  })

  it('sets security headers on every response', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' })

    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['strict-transport-security']).toBeDefined()
    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  it('restricts CORS to configured origins', async () => {
    const allowed = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/contacts',
      headers: { origin: 'https://app.example.com', 'access-control-request-method': 'POST' },
    })
    const denied = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/contacts',
      headers: { origin: 'https://evil.example.com', 'access-control-request-method': 'POST' },
    })

    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('serves the OpenAPI document', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/openapi.json' })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ paths: Record<string, unknown> }>().paths).toHaveProperty('/auth/login')
  })

  it('never rate limits health probes', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => app.inject({ method: 'GET', url: '/health/live' }))
    )

    expect(responses.map((response) => response.statusCode)).toEqual(
      Array.from({ length: 10 }, () => 200)
    )
  })

  it('rate limits before auth, so token brute force is throttled too', async () => {
    const statuses: number[] = []
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({ method: 'GET', url: '/api/v1/user/me' })
      statuses.push(response.statusCode)
    }

    expect(statuses).toContain(429)
  })
})
