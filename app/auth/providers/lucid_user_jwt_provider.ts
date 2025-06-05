import { symbols } from '@adonisjs/auth'
import User from '#models/user'
import type { JwtGuardUser, JwtUserProviderContract } from '#types/auth/jwt_guard'

export class LucidJwtUserProvider implements JwtUserProviderContract<User> {
  declare [symbols.PROVIDER_REAL_USER]: User

  async createUserForGuard(user: User): Promise<JwtGuardUser<User>> {
    return {
      getId: () => user.id,
      getRole: () => user.role,
      getOriginal: () => user,
    }
  }

  async findById(id: string | number | bigint): Promise<JwtGuardUser<User> | null> {
    const user = await User.find(id)

    if (!user) return null

    return {
      getId: () => user.id,
      getRole: () => user.role,
      getOriginal: () => user,
    }
  }
}
