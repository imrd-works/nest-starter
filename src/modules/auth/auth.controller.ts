import { Body, Controller, HttpStatus, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { ApiContract, Public } from '../../common/index.js'

import {
  authResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
} from './auth.schemas.js'
import { AuthService } from './auth.service.js'

/** Credential endpoints get a much stricter rate limit than the global one (brute force). */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } }

@ApiTags('auth')
@Public()
@Throttle(AUTH_THROTTLE)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiContract({
    summary: 'Exchange credentials for an access token',
    response: authResponseSchema,
    errors: [HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS],
  })
  login(@Body({ schema: loginRequestSchema }) body: LoginRequest): Promise<AuthResponse> {
    return this.auth.login(body)
  }

  @Post('register')
  @ApiContract({
    summary: 'Create an account and get an access token',
    status: HttpStatus.CREATED,
    response: authResponseSchema,
    errors: [HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT, HttpStatus.TOO_MANY_REQUESTS],
  })
  register(@Body({ schema: registerRequestSchema }) body: RegisterRequest): Promise<AuthResponse> {
    return this.auth.register(body)
  }
}
