import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'
import type pg from 'pg'

import { APP_CONFIG, type AppConfig } from '../config/index.js'

import { createDatabase, createPool, DATABASE, DATABASE_POOL } from './database.js'

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createPool(config.database.url, config.database.poolMax),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: createDatabase,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end()
  }
}
