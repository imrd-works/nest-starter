import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsersService } from '../users/index.js'

import { AuthService } from './auth.service.js'
import type { PasswordService } from './password.service.js'

const user = {
  id: '6f1c2c0e-7d2a-4d8e-9a54-1d5b0b7f3c11',
  email: 'jane@example.com',
  name: 'Jane',
  passwordHash: 'stored-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('AuthService', () => {
  const users = {
    findByEmail: vi.fn<UsersService['findByEmail']>(),
    create: vi.fn<UsersService['create']>(),
  }
  const passwords = {
    hash: vi.fn<PasswordService['hash']>(),
    verify: vi.fn<PasswordService['verify']>(),
  }
  const jwt = new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: 60 } })
  let auth: AuthService

  beforeEach(() => {
    passwords.hash.mockResolvedValue('dummy-hash')
    auth = new AuthService(
      users as unknown as UsersService,
      passwords as unknown as PasswordService,
      jwt
    )
  })

  it('issues a verifiable token for valid credentials', async () => {
    users.findByEmail.mockResolvedValue(user)
    passwords.verify.mockResolvedValue(true)

    const result = await auth.login({ email: user.email, password: 'secret' })

    expect(result.user).toBe(user)
    await expect(auth.verifyAccessToken(result.token)).resolves.toEqual({
      id: user.id,
      email: user.email,
    })
  })

  it('rejects a wrong password', async () => {
    users.findByEmail.mockResolvedValue(user)
    passwords.verify.mockResolvedValue(false)

    await expect(auth.login({ email: user.email, password: 'nope' })).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it('still runs a hash comparison for unknown emails (no timing leak)', async () => {
    users.findByEmail.mockResolvedValue(undefined)
    passwords.verify.mockResolvedValue(false)

    await expect(auth.login({ email: 'ghost@example.com', password: 'x' })).rejects.toThrow(
      'Invalid email or password'
    )
    expect(passwords.verify).toHaveBeenCalledWith('x', 'dummy-hash')
  })

  it('hashes the password on registration', async () => {
    passwords.hash.mockResolvedValue('new-hash')
    users.create.mockResolvedValue(user)

    const result = await auth.register({ email: user.email, name: 'Jane', password: 'password123' })

    expect(users.create).toHaveBeenCalledWith({
      email: user.email,
      name: 'Jane',
      passwordHash: 'new-hash',
    })
    expect(result.token).toEqual(expect.any(String))
  })

  it('rejects tokens signed with another secret', async () => {
    const forged = await new JwtService({ secret: 'y'.repeat(32) }).signAsync({
      sub: '1',
      email: 'a@b.c',
    })

    await expect(auth.verifyAccessToken(forged)).rejects.toThrow()
  })
})
