import { z } from 'zod'

/** Every error the API returns has this shape (see openapi.json → ErrorResponse). */
export const errorResponseSchema = z
  .object({
    statusCode: z.number().int(),
    error: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    requestId: z.string().optional(),
  })
  .meta({ id: 'ErrorResponse' })

export type ErrorResponse = z.infer<typeof errorResponseSchema>
export type ErrorDetail = NonNullable<ErrorResponse['details']>[number]
