import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import type { AuthUser } from '../../common/index.js'
import { UsersService } from '../users/index.js'

import type { AuthResponse, LoginRequest, RegisterRequest } from './auth.schemas.js'
import { PasswordService } from './password.service.js'

export interface AccessTokenPayload {
  sub: string
  email: string
}

@Injectable()
export class AuthService {
  /** Compared against when the email is unknown, so response time does not reveal registered emails. */
  private dummyHash: Promise<string> | undefined

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService
  ) {}

  async login({ email, password }: LoginRequest): Promise<AuthResponse> {
    const user = await this.users.findByEmail(email)
    this.dummyHash ??= this.passwords.hash('dummy-password-for-timing')
    const isValid = await this.passwords.verify(
      password,
      user?.passwordHash ?? (await this.dummyHash)
    )

    if (!user || !isValid) throw new UnauthorizedException('Invalid email or password')
    return this.issueToken(user)
  }

  async register({ email, name, password }: RegisterRequest): Promise<AuthResponse> {
    const passwordHash = await this.passwords.hash(password)
    const user = await this.users.create({ email, name, passwordHash })
    return this.issueToken(user)
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token)
    return { id: payload.sub, email: payload.email }
  }

  private async issueToken(user: {
    id: string
    email: string
    name: string
  }): Promise<AuthResponse> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email }
    const token = await this.jwt.signAsync(payload)
    return { token, user }
  }
}
