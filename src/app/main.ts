import 'reflect-metadata'

import { loadConfig } from '../core/config/index.js'

import { createApp } from './app.factory.js'

// Local development: read `.env` natively (Node 24). In production env comes from the platform.
try {
  process.loadEnvFile()
} catch {
  // No .env file — rely on the real environment.
}

const config = loadConfig()
const app = await createApp()
await app.listen({ port: config.http.port, host: config.http.host })
