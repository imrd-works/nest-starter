import { Inject, Injectable } from '@nestjs/common'

import { DATABASE, type Database } from '../../core/database/index.js'

import { contactMessagesTable, type NewContactMessageRecord } from './contact-messages.table.js'

@Injectable()
export class ContactsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async insert(values: NewContactMessageRecord): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(contactMessagesTable)
      .values(values)
      .returning({ id: contactMessagesTable.id })
    if (!row) throw new Error('Insert into contact_messages returned no row')
    return row
  }
}
