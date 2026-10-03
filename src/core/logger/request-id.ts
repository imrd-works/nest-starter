import { randomUUID } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'

export const REQUEST_ID_HEADER = 'x-request-id'

const MAX_LENGTH = 128
/** Only safe characters: an incoming id ends up in logs (log injection). */
const SAFE_ID = /^[\w.:-]+$/

/** Reuses a request id set by a gateway/another service, or generates a new one. */
export function resolveRequestId(request: { headers: IncomingHttpHeaders }): string {
  const incoming = request.headers[REQUEST_ID_HEADER]
  if (typeof incoming === 'string' && incoming.length <= MAX_LENGTH && SAFE_ID.test(incoming)) {
    return incoming
  }
  return randomUUID()
}
