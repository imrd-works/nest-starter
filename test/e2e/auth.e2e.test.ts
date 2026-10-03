import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createTestApp, resetDatabase, uniqueClient } from '../setup/test-app.js'

const credentials = { email: 'Jane@Example.com', name: 'Jane', password: 'password123' }

describe('auth & user (e2e)', () => {
  let app: NestFastifyApplication
  let client: { remoteAddress: string }

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDatabase(app)
    client = uniqueClient()
  })

  async function register(body: object = credentials) {
    return app.inject({ ...client, method: 'POST', url: '/api/v1/auth/register', payload: body })
  }

  it('registers, logs in and reads the profile with the token', async () => {
    const registered = await register()
    expect(registered.statusCode).toBe(201)

    const login = await app.inject({
      ...client,
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'jane@example.com', password: credentials.password },
    })
    expect(login.statusCode).toBe(200)
    const { token, user } = login.json<{ token: string; user: Record<string, unknown> }>()
    expect(user).toEqual({ id: expect.any(String), email: 'jane@example.com', name: 'Jane' })

    const me = await app.inject({
      ...client,
      method: 'GET',
      url: '/api/v1/user/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toEqual(user)
  })

  it('never exposes the password hash', async () => {
    const response = await register()

    expect(response.body).not.toContain('passwordHash')
    expect(response.body).not.toContain('scrypt$')
  })

  it('rejects a duplicate email with 409 (case-insensitive)', async () => {
    await register()
    const duplicate = await register({ ...credentials, email: 'JANE@example.com' })

    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json()).toMatchObject({
      statusCode: 409,
      message: 'Email is already registered',
    })
  })

  it('returns the same 401 for an unknown email and a wrong password', async () => {
    await register()
    const login = (email: string, password: string) =>
      app.inject({
        ...client,
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
      })

    const wrongPassword = await login(credentials.email, 'wrong-password')
    const unknownEmail = await login('ghost@example.com', credentials.password)

    expect(wrongPassword.statusCode).toBe(401)
    expect(unknownEmail.statusCode).toBe(401)
    expect(wrongPassword.json<{ message: string }>().message).toBe(
      unknownEmail.json<{ message: string }>().message
    )
  })

  it('validates the body and reports every invalid field', async () => {
    const response = await register({ email: 'not-an-email', name: '', password: 'short' })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: expect.arrayContaining([
        expect.objectContaining({ path: 'email' }),
        expect.objectContaining({ path: 'name' }),
        expect.objectContaining({ path: 'password' }),
      ]),
    })
  })

  it('protects routes by default', async () => {
    const missing = await app.inject({ ...client, method: 'GET', url: '/api/v1/user/me' })
    const invalid = await app.inject({
      ...client,
      method: 'GET',
      url: '/api/v1/user/me',
      headers: { authorization: 'Bearer not-a-jwt' },
    })

    expect(missing.statusCode).toBe(401)
    expect(invalid.statusCode).toBe(401)
    expect(invalid.json()).toMatchObject({ message: 'Invalid or expired access token' })
  })
})
