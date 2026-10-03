import { ConflictException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsersRepository } from './users.repository.js'
import { UsersService } from './users.service.js'
import type { UserRecord } from './users.table.js'

const user: UserRecord = {
  id: '6f1c2c0e-7d2a-4d8e-9a54-1d5b0b7f3c11',
  email: 'jane@example.com',
  name: 'Jane',
  passwordHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('UsersService', () => {
  const repository = {
    findById: vi.fn<UsersRepository['findById']>(),
    findByEmail: vi.fn<UsersRepository['findByEmail']>(),
    insert: vi.fn<UsersRepository['insert']>(),
  }
  let service: UsersService

  beforeEach(() => {
    service = new UsersService(repository as unknown as UsersRepository)
  })

  it('returns a user by id and throws 404 when missing', async () => {
    repository.findById.mockResolvedValueOnce(user).mockResolvedValueOnce(undefined)

    await expect(service.getById(user.id)).resolves.toBe(user)
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('normalizes emails before lookup and insert', async () => {
    repository.insert.mockResolvedValue(user)

    await service.findByEmail('  Jane@Example.COM ')
    await service.create({ email: 'JANE@example.com', name: 'Jane', passwordHash: 'hash' })

    expect(repository.findByEmail).toHaveBeenCalledWith('jane@example.com')
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' })
    )
  })

  it('maps a unique violation (also when wrapped) to 409 and rethrows other errors', async () => {
    repository.insert.mockRejectedValueOnce(new Error('query failed', { cause: { code: '23505' } }))
    const failure = new Error('connection lost')
    repository.insert.mockRejectedValueOnce(failure)

    const input = { email: 'jane@example.com', name: 'Jane', passwordHash: 'hash' }
    await expect(service.create(input)).rejects.toBeInstanceOf(ConflictException)
    await expect(service.create(input)).rejects.toBe(failure)
  })
})
