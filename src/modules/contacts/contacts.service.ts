import { Injectable, Logger } from '@nestjs/common'

import { ContactsRepository } from './contacts.repository.js'
import type { ContactRequest, ContactResponse } from './contacts.schemas.js'

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name)

  constructor(private readonly repository: ContactsRepository) {}

  async send(request: ContactRequest): Promise<ContactResponse> {
    const { id } = await this.repository.insert(request)
    // Hook for notifications (email, Slack) — keep it async, never block the response.
    this.logger.log({ contactMessageId: id }, 'Contact message received')
    return { id }
  }
}
