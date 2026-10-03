import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'

import { AuthService } from '../modules/auth/index.js'
import { UsersService } from '../modules/users/index.js'

import { AppModule } from './app.module.js'

/** Development data. Demo account matches the react-starter login hint. */
const DEMO_USER = { email: 'demo@example.com', name: 'Demo User', password: 'password123' }

try {
  process.loadEnvFile()
} catch {
  // No .env file — rely on the real environment.
}

if (process.env['NODE_ENV'] === 'production') {
  console.error('Refusing to seed a production database.')
  process.exit(1)
}

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
try {
  if (await app.get(UsersService).findByEmail(DEMO_USER.email)) {
    console.log(`Demo user already exists: ${DEMO_USER.email}`)
  } else {
    await app.get(AuthService).register(DEMO_USER)
    console.log(`Created demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`)
  }
} finally {
  await app.close()
}
