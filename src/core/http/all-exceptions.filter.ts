import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'

import type { ErrorDetail, ErrorResponse } from '../../common/index.js'

const FIRST_SERVER_ERROR_STATUS = 500

const STATUS_TEXT: Partial<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
}

interface HttpExceptionBody {
  message?: unknown
  details?: ErrorDetail[]
}

function statusText(status: number): string {
  return STATUS_TEXT[status] ?? 'Error'
}

function fromHttpException(exception: HttpException): Omit<ErrorResponse, 'requestId'> {
  const status = exception.getStatus()
  const response = exception.getResponse() as string | HttpExceptionBody
  const body = typeof response === 'string' ? { message: response } : response
  const message = typeof body.message === 'string' ? body.message : exception.message

  return {
    statusCode: status,
    error: statusText(status),
    message,
    ...(body.details ? { details: body.details } : {}),
  }
}

/** Fastify's own client errors (malformed JSON, body too large) carry `statusCode`. */
function isClientError(exception: unknown): exception is { statusCode: number; message: string } {
  if (typeof exception !== 'object' || exception === null) return false
  const { statusCode, message } = exception as { statusCode?: unknown; message?: unknown }
  return (
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 500 &&
    typeof message === 'string'
  )
}

/**
 * Single place that shapes every error response. Internals of 5xx errors are
 * logged with the request id and never leaked to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const request = context.getRequest<FastifyRequest>()
    const reply = context.getResponse<FastifyReply>()
    const requestId = request.id

    const body = this.toBody(exception)
    if (body.statusCode >= FIRST_SERVER_ERROR_STATUS) {
      this.logger.error({ err: exception, requestId }, 'Unhandled exception')
    }

    void reply.status(body.statusCode).send({ ...body, requestId })
  }

  private toBody(exception: unknown): Omit<ErrorResponse, 'requestId'> {
    if (exception instanceof HttpException) return fromHttpException(exception)
    if (isClientError(exception)) {
      return {
        statusCode: exception.statusCode,
        error: statusText(exception.statusCode),
        message: exception.message,
      }
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: statusText(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Internal server error',
    }
  }
}
