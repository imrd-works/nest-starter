import { applyDecorators, HttpCode, HttpStatus, SerializeOptions } from '@nestjs/common'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import type { StandardSchemaV1 } from '@standard-schema/spec'

import { errorResponseSchema } from './error-response.js'

type ResponseSchema = StandardSchemaV1

export interface ApiContractOptions {
  summary: string
  status?: HttpStatus
  /** Response body. Validated and stripped of unknown fields before it is sent. */
  response?: ResponseSchema
  /** Error statuses the endpoint may return (documented with the ErrorResponse schema). */
  errors?: HttpStatus[]
}

/**
 * One decorator = the endpoint contract: status code, response shape (runtime
 * serialization + OpenAPI) and documented errors. Request bodies are declared on
 * the parameter: `@Body({ schema })`.
 */
export function ApiContract({
  summary,
  status = HttpStatus.OK,
  response,
  errors = [],
}: ApiContractOptions): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary }),
    HttpCode(status),
    ...(response
      ? [
          SerializeOptions({ schema: response }),
          ApiResponse({ status, description: 'Success', standardSchema: response }),
        ]
      : [ApiResponse({ status, description: 'Success' })]),
    ...errors.map((errorStatus) =>
      ApiResponse({
        status: errorStatus,
        description: 'Error',
        standardSchema: errorResponseSchema,
      })
    )
  )
}
