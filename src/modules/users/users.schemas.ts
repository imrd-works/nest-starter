import { z } from 'zod'

/** Public user representation. Anything not listed here (passwordHash!) is stripped. */
export const userSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
  })
  .meta({ id: 'User' })

export type User = z.infer<typeof userSchema>
