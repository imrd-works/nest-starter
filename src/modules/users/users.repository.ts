import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { DATABASE, type Database } from '../../core/database/index.js'

import { usersTable, type NewUserRecord, type UserRecord } from './users.table.js'

/** The only place that talks SQL for users. Services never touch Drizzle directly. */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await this.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    return user
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
    return user
  }

  async insert(values: NewUserRecord): Promise<UserRecord> {
    const [user] = await this.db.insert(usersTable).values(values).returning()
    if (!user) throw new Error('Insert into users returned no row')
    return user
  }
}
