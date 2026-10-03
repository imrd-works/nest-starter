// @ts-check
/**
 * Hooks run with whatever `node` is on PATH. Fail fast with a clear message
 * instead of obscure tool crashes when it is older than the version in .nvmrc
 * (the same file nvm and CI use).
 */
import { readFileSync } from 'node:fs'

const required = Math.trunc(Number(readFileSync('.nvmrc', 'utf8').trim()))
const current = Math.trunc(Number(process.versions.node.split('.', 1)[0]))

if (current < required) {
  console.error(
    `✖ Node ${String(required)}+ is required, but hooks are running on Node ${process.versions.node}.\n` +
      `  Switch versions: nvm use (reads .nvmrc), then retry.`
  )
  process.exit(1)
}
