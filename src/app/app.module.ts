import {
  Module,
  StandardSchemaSerializerInterceptor,
  StandardSchemaValidationPipe,
} from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { APP_CONFIG, ConfigModule, type AppConfig } from '../core/config/index.js'
import { DatabaseModule } from '../core/database/index.js'
import { HealthModule } from '../core/health/index.js'
import { AllExceptionsFilter, validationExceptionFactory } from '../core/http/index.js'
import { LoggerModule } from '../core/logger/index.js'
import { AuthModule, JwtAuthGuard } from '../modules/auth/index.js'
import { ContactsModule } from '../modules/contacts/index.js'
import { UsersModule } from '../modules/users/index.js'

@Module({
  imports: [
    // Infrastructure
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    HealthModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: config.throttle.ttlMs, limit: config.throttle.limit }],
      }),
    }),
    // Features
    AuthModule,
    UsersModule,
    ContactsModule,
  ],
  providers: [
    // Registered through DI (not app.useGlobal*) so they also apply in tests.
    // Order matters: rate limit first, so brute-forcing tokens is throttled too.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_PIPE,
      useValue: new StandardSchemaValidationPipe({ exceptionFactory: validationExceptionFactory }),
    },
    { provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor },
  ],
})
export class AppModule {}
