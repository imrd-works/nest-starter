import { Controller, Get } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus'
import { SkipThrottle } from '@nestjs/throttler'

import { Public } from '../../common/index.js'

import { DatabaseHealthIndicator } from './database.health.js'

/**
 * Probes live outside the /api/v1 prefix and skip auth and request logging.
 * - live:  the process is up (restart it if this fails)
 * - ready: dependencies are reachable (stop routing traffic if this fails)
 * Never rate limited: an orchestrator must always reach them. Not part of the API contract.
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([])
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.check()])
  }
}
