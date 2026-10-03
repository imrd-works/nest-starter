import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto'
import { promisify } from 'node:util'

import { Injectable } from '@nestjs/common'

const scrypt = promisify<string, Buffer, number, ScryptOptions, Buffer>(scryptCallback)

/** OWASP Password Storage Cheat Sheet: scrypt N=2^17, r=8, p=1. */
const COST = 2 ** 17
const BLOCK_SIZE = 8
const PARALLELIZATION = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16
const MAX_MEMORY = 2 * 128 * COST * BLOCK_SIZE

/**
 * Password hashing with Node's built-in scrypt — no native addons to compile.
 * Format: `scrypt$N$r$p$salt$hash` (base64url), so parameters can be raised later
 * without breaking existing hashes.
 */
@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH)
    const key = await this.derive(password, salt, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION })
    return [
      'scrypt',
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join('$')
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [algorithm, cost, blockSize, parallelization, salt, hash] = stored.split('$', 6)
    if (algorithm !== 'scrypt' || !cost || !blockSize || !parallelization || !salt || !hash) {
      return false
    }

    const expected = Buffer.from(hash, 'base64url')
    const actual = await this.derive(password, Buffer.from(salt, 'base64url'), {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    })
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }

  private derive(
    password: string,
    salt: Buffer,
    params: { N: number; r: number; p: number }
  ): Promise<Buffer> {
    return scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { ...params, maxmem: MAX_MEMORY })
  }
}
