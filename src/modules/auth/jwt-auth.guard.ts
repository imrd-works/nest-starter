import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IS_PUBLIC_KEY, type AuthenticatedRequest } from '../../common/index.js'

import { AuthService } from './auth.service.js'

const BEARER_PREFIX = 'Bearer '

/** Registered globally: every route is protected unless marked with `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = request.headers.authorization
    if (!header?.startsWith(BEARER_PREFIX)) throw new UnauthorizedException('Missing access token')

    try {
      request.user = await this.auth.verifyAccessToken(header.slice(BEARER_PREFIX.length))
    } catch {
      throw new UnauthorizedException('Invalid or expired access token')
    }
    return true
  }
}
