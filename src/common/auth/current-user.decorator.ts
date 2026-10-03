import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

/** Identity attached to the request by the auth guard. */
export interface AuthUser {
  id: string
  email: string
}

export type AuthenticatedRequest = FastifyRequest & { user?: AuthUser }

/** Injects the authenticated user: `me(@CurrentUser() user: AuthUser)`. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
  if (!request.user) throw new UnauthorizedException()
  return request.user
})
