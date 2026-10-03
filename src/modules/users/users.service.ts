import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { UsersRepository } from './users.repository.js'
import type { UserRecord } from './users.table.js'

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { code, cause } = error as { code?: unknown; cause?: unknown }
  return code === UNIQUE_VIOLATION || (cause !== undefined && isUniqueViolation(cause))
}

export interface CreateUserInput {
  email: string
  name: string
  passwordHash: string
}

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async getById(id: string): Promise<UserRecord> {
    const user = await this.repository.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  findByEmail(email: string): Promise<UserRecord | undefined> {
    return this.repository.findByEmail(normalizeEmail(email))
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      return await this.repository.insert({ ...input, email: normalizeEmail(input.email) })
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Email is already registered')
      throw error
    }
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
