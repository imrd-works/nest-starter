import { Body, Controller, HttpStatus, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { ApiContract, Public } from '../../common/index.js'

import {
  contactRequestSchema,
  contactResponseSchema,
  type ContactRequest,
  type ContactResponse,
} from './contacts.schemas.js'
import { ContactsService } from './contacts.service.js'

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiContract({
    summary: 'Send a message from the contact form',
    status: HttpStatus.CREATED,
    response: contactResponseSchema,
    errors: [HttpStatus.BAD_REQUEST, HttpStatus.TOO_MANY_REQUESTS],
  })
  send(@Body({ schema: contactRequestSchema }) body: ContactRequest): Promise<ContactResponse> {
    return this.contacts.send(body)
  }
}
