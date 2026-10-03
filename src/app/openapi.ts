import 'reflect-metadata'

import { readFile, writeFile } from 'node:fs/promises'

import { createOpenApiDocument } from '../core/http/index.js'

import { createApp } from './app.factory.js'

/**
 * Exports openapi.json without a database (preview mode does not instantiate providers).
 *   npm run openapi            write openapi.json
 *   npm run openapi -- --check fail if openapi.json is outdated (CI)
 */
const OUTPUT = 'openapi.json'

process.env['DATABASE_URL'] ??= 'postgres://openapi:openapi@localhost:5432/openapi'
process.env['JWT_SECRET'] ??= 'openapi-export-placeholder-secret-0000'
process.env['SWAGGER_ENABLED'] = 'false'

const app = await createApp({ preview: true })
const document = createOpenApiDocument(app)
const content = `${JSON.stringify(document, null, 2)}\n`
await app.close()

async function readCurrent(): Promise<string> {
  try {
    return await readFile(OUTPUT, 'utf8')
  } catch {
    return ''
  }
}

if (process.argv.includes('--check')) {
  if ((await readCurrent()) !== content) {
    console.error(`${OUTPUT} is out of date. Run \`npm run openapi\` and commit the result.`)
    process.exit(1)
  }
} else {
  await writeFile(OUTPUT, content)
}
