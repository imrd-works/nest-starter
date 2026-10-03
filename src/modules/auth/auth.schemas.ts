import { z } from 'zod'

import { userSchema } from '../users/index.js'

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const loginRequestSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .meta({ id: 'LoginRequest' })

export const registerRequestSchema = z
  .object({
    email: z.email(),
    name: z.string().trim().min(1).max(100),
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  })
  .meta({ id: 'RegisterRequest' })

export const authResponseSchema = z
  .object({
    token: z.string(),
    user: userSchema,
  })
  .meta({ id: 'LoginResponse' })

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
