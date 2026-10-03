import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'

/** Query builder for repositories. Tables live in their modules (`*.table.ts`). */
export type Database = NodePgDatabase

export const DATABASE = Symbol('DATABASE')
export const DATABASE_POOL = Symbol('DATABASE_POOL')

export function createPool(url: string, max: number): pg.Pool {
  return new pg.Pool({ connectionString: url, max })
}

/** Cheapest possible round trip — used by the readiness probe. */
export async function pingDatabase(db: Database): Promise<void> {
  await db.execute(sql`select 1`)
}

export function createDatabase(pool: pg.Pool): Database {
  // Must match `casing` in drizzle.config.ts: camelCase in TS ⇄ snake_case in SQL.
  return drizzle({ client: pool, casing: 'snake_case' })
}
