import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const contactMessagesTable = pgTable('contact_messages', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull(),
  message: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export type NewContactMessageRecord = typeof contactMessagesTable.$inferInsert
