import { describe, expect, it } from 'vitest'

import { loadConfig } from './app-config.js'

const validEnv = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
  JWT_SECRET: 'x'.repeat(32),
}

describe('loadConfig', () => {
  it('applies safe defaults for optional variables', () => {
    const config = loadConfig(validEnv)

    expect(config).toMatchObject({
      env: 'development',
      isProduction: false,
      http: {
        host: '0.0.0.0',
        port: 3000,
        trustProxy: false,
        corsOrigins: ['http://localhost:5173'],
      },
      jwt: { expiresInSeconds: 3600 },
      swagger: { enabled: true },
    })
  })

  it('parses lists, numbers and booleans', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      PORT: '8080',
      TRUST_PROXY: 'true',
      CORS_ORIGINS: 'https://a.com, https://b.com',
    })

    expect(config.http).toEqual({
      host: '0.0.0.0',
      port: 8080,
      trustProxy: true,
      corsOrigins: ['https://a.com', 'https://b.com'],
    })
    expect(config.swagger.enabled).toBe(false)
  })

  it('fails fast with a readable list of every invalid variable', () => {
    const load = () =>
      loadConfig({ DATABASE_URL: 'mysql://nope', JWT_SECRET: 'short', PORT: 'abc' })

    expect(load).toThrow('Invalid environment configuration')
    expect(load).toThrow('→ at DATABASE_URL')
    expect(load).toThrow('JWT_SECRET must be at least 32 characters')
    expect(load).toThrow('→ at PORT')
  })
})
