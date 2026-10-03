import { Controller, Get, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { ApiContract, CurrentUser, type AuthUser } from '../../common/index.js'

import { userSchema, type User } from './users.schemas.js'
import { UsersService } from './users.service.js'

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiContract({
    summary: 'Current user profile',
    response: userSchema,
    errors: [HttpStatus.UNAUTHORIZED],
  })
  getCurrentUser(@CurrentUser() authUser: AuthUser): Promise<User> {
    return this.users.getById(authUser.id)
  }
}
