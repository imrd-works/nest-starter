import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AllExceptionsFilter } from './all-exceptions.filter.js'

function createHost() {
  const send = vi.fn<(body: unknown) => void>()
  const status = vi.fn<(code: number) => { send: typeof send }>(() => ({ send }))
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: 'req-1' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost
  return { host, status, send }
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter()

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  it('shapes HttpExceptions and adds the request id', () => {
    const { host, status, send } = createHost()

    filter.catch(new NotFoundException('User not found'), host)

    expect(status).toHaveBeenCalledWith(404)
    expect(send).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'User not found',
      requestId: 'req-1',
    })
  })

  it('keeps validation details', () => {
    const { host, send } = createHost()
    const details = [{ path: 'email', message: 'Invalid email' }]

    filter.catch(new BadRequestException({ message: 'Validation failed', details }), host)

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed', details })
    )
  })

  it('supports string responses and unknown status codes', () => {
    const { host, send } = createHost()

    filter.catch(new HttpException('I am a teapot', 418), host)

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 418, error: 'Error', message: 'I am a teapot' })
    )
  })

  it('passes through Fastify client errors (e.g. body too large)', () => {
    const { host, send } = createHost()

    filter.catch(Object.assign(new Error('Request body is too large'), { statusCode: 413 }), host)

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 413, error: 'Payload Too Large' })
    )
  })

  it('hides internals of unexpected errors and logs them', () => {
    const { host, send } = createHost()

    filter.catch(new Error('connection string with password'), host)
    filter.catch('a thrown string', host)

    expect(send).toHaveBeenNthCalledWith(1, {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
      requestId: 'req-1',
    })
    expect(send).toHaveBeenCalledTimes(2)
    expect(Logger.prototype.error).toHaveBeenCalledTimes(2)
  })
})
