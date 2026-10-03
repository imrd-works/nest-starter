import helmet from '@fastify/helmet'
import { RequestMethod } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Logger } from 'nestjs-pino'

import { loadConfig } from '../core/config/index.js'
import { API_PREFIX, createOpenApiDocument, setupSwaggerUi } from '../core/http/index.js'
import { REQUEST_ID_HEADER, resolveRequestId } from '../core/logger/index.js'

import { AppModule } from './app.module.js'

const BODY_LIMIT_BYTES = 1024 * 1024

export interface CreateAppOptions {
  /** Build the module graph without instantiating providers (no DB) — used to export OpenAPI. */
  preview?: boolean
}

/**
 * Single source of truth for HTTP configuration, shared by production (main.ts),
 * e2e tests and the OpenAPI export — so tests exercise exactly what ships.
 */
export async function createApp({
  preview = false,
}: CreateAppOptions = {}): Promise<NestFastifyApplication> {
  const config = loadConfig()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: config.http.trustProxy,
      bodyLimit: BODY_LIMIT_BYTES,
      // Validated in resolveRequestId instead of trusting the raw header.
      requestIdHeader: false,
      genReqId: resolveRequestId,
    }),
    { bufferLogs: true, preview, abortOnError: false }
  )

  if (!preview) app.useLogger(app.get(Logger))

  // Echo the request id on every response (including 404s and health probes) for tracing.
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, reply, done) => {
      reply.raw.setHeader(REQUEST_ID_HEADER, request.id)
      done()
    })

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'health/*path', method: RequestMethod.ALL }],
  })
  app.enableCors({ origin: [...config.http.corsOrigins], credentials: true })
  app.enableShutdownHooks()

  await app.register(helmet, {
    // Swagger UI needs inline scripts/styles; the API itself only returns JSON.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      },
    },
  })

  if (config.swagger.enabled) setupSwaggerUi(app, createOpenApiDocument(app))

  return app
}
