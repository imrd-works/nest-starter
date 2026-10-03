// @ts-check
/**
 * Scaffolds a feature module with the layering enforced by ESLint:
 * controller → service → repository → table.
 *
 *   npm run generate:module -- <kebab-case-name>
 *   npm run generate:module -- orders
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const [name] = process.argv.slice(2)

if (!name || !KEBAB_CASE.test(name)) {
  console.error(
    'Usage: npm run generate:module -- <kebab-case-name>\nExample: npm run generate:module -- orders'
  )
  process.exit(1)
}

const pascal = name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join('')
const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1)
const snake = name.replaceAll('-', '_')
const root = path.join('src', 'modules', name)

if (existsSync(root)) {
  console.error(`✖ ${root} already exists`)
  process.exit(1)
}

/** @type {Record<string, string>} */
const files = {
  [`${name}.table.ts`]: `import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const ${camel}Table = pgTable('${snake}', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export type ${pascal}Record = typeof ${camel}Table.$inferSelect
export type New${pascal}Record = typeof ${camel}Table.$inferInsert
`,
  [`${name}.repository.ts`]: `import { Inject, Injectable } from '@nestjs/common'

import { DATABASE, type Database } from '../../core/database/index.js'

import { ${camel}Table, type New${pascal}Record, type ${pascal}Record } from './${name}.table.js'

@Injectable()
export class ${pascal}Repository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  findAll(): Promise<${pascal}Record[]> {
    return this.db.select().from(${camel}Table)
  }

  async insert(values: New${pascal}Record): Promise<${pascal}Record> {
    const [row] = await this.db.insert(${camel}Table).values(values).returning()
    if (!row) throw new Error('Insert into ${snake} returned no row')
    return row
  }
}
`,
  [`${name}.schemas.ts`]: `import { z } from 'zod'

export const create${pascal}Schema = z
  .object({ title: z.string().trim().min(1).max(200) })
  .meta({ id: 'Create${pascal}Request' })

export const ${camel}Schema = z
  .object({ id: z.uuid(), title: z.string(), createdAt: z.date() })
  .meta({ id: '${pascal}' })

export type Create${pascal}Request = z.infer<typeof create${pascal}Schema>
export type ${pascal} = z.infer<typeof ${camel}Schema>
`,
  [`${name}.service.ts`]: `import { Injectable } from '@nestjs/common'

import { ${pascal}Repository } from './${name}.repository.js'
import type { ${pascal}, Create${pascal}Request } from './${name}.schemas.js'

@Injectable()
export class ${pascal}Service {
  constructor(private readonly repository: ${pascal}Repository) {}

  list(): Promise<${pascal}[]> {
    return this.repository.findAll()
  }

  create(request: Create${pascal}Request): Promise<${pascal}> {
    return this.repository.insert(request)
  }
}
`,
  [`${name}.service.test.ts`]: `import { describe, expect, it, vi } from 'vitest'

import type { ${pascal}Repository } from './${name}.repository.js'
import { ${pascal}Service } from './${name}.service.js'

describe('${pascal}Service', () => {
  it('creates an item through the repository', async () => {
    const created = { id: '6f1c2c0e-7d2a-4d8e-9a54-1d5b0b7f3c11', title: 'First', createdAt: new Date() }
    const repository = { findAll: vi.fn(), insert: vi.fn().mockResolvedValue(created) }
    const service = new ${pascal}Service(repository as unknown as ${pascal}Repository)

    await expect(service.create({ title: 'First' })).resolves.toBe(created)
    expect(repository.insert).toHaveBeenCalledWith({ title: 'First' })
  })
})
`,
  [`${name}.controller.ts`]: `import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { ApiContract } from '../../common/index.js'

import {
  create${pascal}Schema,
  ${camel}Schema,
  type ${pascal},
  type Create${pascal}Request,
} from './${name}.schemas.js'
import { ${pascal}Service } from './${name}.service.js'

@ApiTags('${name}')
@ApiBearerAuth()
@Controller('${name}')
export class ${pascal}Controller {
  constructor(private readonly service: ${pascal}Service) {}

  @Get()
  @ApiContract({ summary: 'List ${name}', response: z.array(${camel}Schema), errors: [HttpStatus.UNAUTHORIZED] })
  list(): Promise<${pascal}[]> {
    return this.service.list()
  }

  @Post()
  @ApiContract({
    summary: 'Create ${name}',
    status: HttpStatus.CREATED,
    response: ${camel}Schema,
    errors: [HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED],
  })
  create(@Body({ schema: create${pascal}Schema }) body: Create${pascal}Request): Promise<${pascal}> {
    return this.service.create(body)
  }
}
`,
  [`${name}.module.ts`]: `import { Module } from '@nestjs/common'

import { ${pascal}Controller } from './${name}.controller.js'
import { ${pascal}Repository } from './${name}.repository.js'
import { ${pascal}Service } from './${name}.service.js'

@Module({
  controllers: [${pascal}Controller],
  providers: [${pascal}Service, ${pascal}Repository],
})
export class ${pascal}Module {}
`,
  'index.ts': `export { ${pascal}Module } from './${name}.module.js'\n`,
}

mkdirSync(root, { recursive: true })
for (const [file, content] of Object.entries(files)) writeFileSync(path.join(root, file), content)

console.log(`✔ Created ${root}
Next steps:
  1. Register ${pascal}Module in src/app/app.module.ts
  2. npm run db:generate   → migration for the new table
  3. npm run openapi       → update the API contract
  4. Cover the HTTP contract with an e2e test in test/e2e/`)
