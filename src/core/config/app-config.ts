import { z } from 'zod'

import { envSchema } from './env.schema.js'

/** Typed, validated application configuration. Inject with `@Inject(APP_CONFIG)`. */
export interface AppConfig {
  readonly env: 'development' | 'test' | 'production'
  readonly isProduction: boolean
  readonly http: {
    readonly host: string
    readonly port: number
    readonly trustProxy: boolean
    readonly corsOrigins: readonly string[]
  }
  readonly logLevel: string
  readonly database: { readonly url: string; readonly poolMax: number }
  readonly jwt: { readonly secret: string; readonly expiresInSeconds: number }
  readonly swagger: { readonly enabled: boolean }
  readonly throttle: { readonly ttlMs: number; readonly limit: number }
}

export const APP_CONFIG = Symbol('APP_CONFIG')

/**
 * Parses and validates the environment. Throws a readable error listing every
 * invalid variable, so a misconfigured app never starts.
 */
export function loadConfig(source: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`)
  }

  const env = parsed.data
  const isProduction = env.NODE_ENV === 'production'

  return {
    env: env.NODE_ENV,
    isProduction,
    http: {
      host: env.HOST,
      port: env.PORT,
      trustProxy: env.TRUST_PROXY,
      corsOrigins: env.CORS_ORIGINS,
    },
    logLevel: env.LOG_LEVEL,
    database: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX },
    jwt: { secret: env.JWT_SECRET, expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS },
    swagger: { enabled: env.SWAGGER_ENABLED ?? !isProduction },
    throttle: { ttlMs: env.THROTTLE_TTL_MS, limit: env.THROTTLE_LIMIT },
  }
}
