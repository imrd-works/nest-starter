import { UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { describe, expect, it, vi } from 'vitest'

import type { AuthenticatedRequest } from '../../common/index.js'

import type { AuthService } from './auth.service.js'
import { JwtAuthGuard } from './jwt-auth.guard.js'

function createContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

function createGuard(isPublic: boolean, verify = vi.fn<AuthService['verifyAccessToken']>()) {
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector
  const guard = new JwtAuthGuard(reflector, { verifyAccessToken: verify } as unknown as AuthService)
  return { guard, verify }
}

describe('JwtAuthGuard', () => {
  it('lets public routes through without a token', async () => {
    const { guard, verify } = createGuard(true)

    await expect(guard.canActivate(createContext({ headers: {} }))).resolves.toBe(true)
    expect(verify).not.toHaveBeenCalled()
  })

  it('rejects requests without a bearer token', async () => {
    const { guard } = createGuard(false)

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Basic abc' } }))
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('attaches the user for a valid token and rejects an invalid one', async () => {
    const verify = vi.fn<AuthService['verifyAccessToken']>()
    verify
      .mockResolvedValueOnce({ id: '1', email: 'a@b.co' })
      .mockRejectedValueOnce(new Error('expired'))
    const { guard } = createGuard(false, verify)
    const request: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer good' } }

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true)
    expect(request.user).toEqual({ id: '1', email: 'a@b.co' })
    expect(verify).toHaveBeenCalledWith('good')

    await expect(
      guard.canActivate(createContext({ headers: { authorization: 'Bearer bad' } }))
    ).rejects.toThrow('Invalid or expired access token')
  })
})
