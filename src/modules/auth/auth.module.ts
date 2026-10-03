import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { APP_CONFIG, type AppConfig } from '../../core/config/index.js'
import { UsersModule } from '../users/index.js'

import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { JwtAuthGuard } from './jwt-auth.guard.js'
import { PasswordService } from './password.service.js'

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.jwt.secret,
        signOptions: { expiresIn: config.jwt.expiresInSeconds, algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtAuthGuard],
  // The guard is registered globally in AppModule, after the rate limiter.
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
