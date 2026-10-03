import { Inject, Injectable } from '@nestjs/common'
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus'

import { DATABASE, pingDatabase, type Database } from '../database/index.js'

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly healthIndicatorService: HealthIndicatorService
  ) {}

  async check(key = 'database'): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key)
    try {
      await pingDatabase(this.db)
      return indicator.up()
    } catch (error) {
      return indicator.down({ message: error instanceof Error ? error.message : 'unreachable' })
    }
  }
}
