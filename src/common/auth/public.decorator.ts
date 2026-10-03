import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'auth:isPublic'

/**
 * Every route requires a valid access token by default (secure by default).
 * Mark the rare public endpoints explicitly.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true)
