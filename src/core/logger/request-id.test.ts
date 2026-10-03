import type { IncomingHttpHeaders } from 'node:http'

import { describe, expect, it } from 'vitest'

import { resolveRequestId } from './request-id.js'

const request = (id?: string) =>
  ({ headers: id === undefined ? {} : { 'x-request-id': id } }) as { headers: IncomingHttpHeaders }

describe('resolveRequestId', () => {
  it('reuses a safe incoming id', () => {
    expect(resolveRequestId(request('trace-123:abc.def'))).toBe('trace-123:abc.def')
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['too long', 'a'.repeat(129)],
    ['log injection', 'abc\n{"level":60}'],
  ])('generates a UUID when the incoming id is %s', (_name, id) => {
    expect(resolveRequestId(request(id))).toMatch(/^[0-9a-f-]{36}$/)
  })
})
