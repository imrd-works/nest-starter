import { BadRequestException } from '@nestjs/common'
import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { ErrorDetail } from '../../common/index.js'

function formatPath(path: StandardSchemaV1.Issue['path']): string {
  return (path ?? [])
    .map((segment) => (typeof segment === 'object' ? segment.key : segment))
    .map(String)
    .join('.')
}

/** Turns schema issues into a 400 with a machine-readable `details` list. */
export function validationExceptionFactory(
  issues: readonly StandardSchemaV1.Issue[]
): BadRequestException {
  const details: ErrorDetail[] = issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message,
  }))
  return new BadRequestException({ message: 'Validation failed', details })
}
