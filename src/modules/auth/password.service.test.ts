import { describe, expect, it } from 'vitest'

import { PasswordService } from './password.service.js'

describe('PasswordService', () => {
  const passwords = new PasswordService()

  it('hashes with a random salt and verifies the right password only', async () => {
    const first = await passwords.hash('correct horse battery staple')
    const second = await passwords.hash('correct horse battery staple')

    expect(first).toMatch(/^scrypt\$131072\$8\$1\$[\w-]+\$[\w-]+$/)
    expect(first).not.toBe(second)
    await expect(passwords.verify('correct horse battery staple', first)).resolves.toBe(true)
    await expect(passwords.verify('wrong password', first)).resolves.toBe(false)
  })

  it('rejects malformed hashes without throwing', async () => {
    await expect(passwords.verify('anything', 'plain-text')).resolves.toBe(false)
    await expect(passwords.verify('anything', 'bcrypt$1$2$3$a$b')).resolves.toBe(false)
  })
})
