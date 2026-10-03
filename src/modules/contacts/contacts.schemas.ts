import { z } from 'zod'

export const MESSAGE_MIN_LENGTH = 10
export const MESSAGE_MAX_LENGTH = 1000

/** Mirrors the frontend form validation (react-starter: features/contact-form). */
export const contactRequestSchema = z
  .object({
    email: z.email(),
    message: z.string().trim().min(MESSAGE_MIN_LENGTH).max(MESSAGE_MAX_LENGTH),
  })
  .meta({ id: 'ContactRequest' })

export const contactResponseSchema = z.object({ id: z.uuid() }).meta({ id: 'ContactResponse' })

export type ContactRequest = z.infer<typeof contactRequestSchema>
export type ContactResponse = z.infer<typeof contactResponseSchema>
