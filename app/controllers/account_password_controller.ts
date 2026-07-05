import { AuthRevocationService } from '#services/auth_revocation_service'
import { RefreshTokenService } from '#services/refresh_token_service'
import { changePasswordValidator } from '#validators/user/change_password'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountPasswordController {
  async update({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, newPassword } = await request.validateUsing(changePasswordValidator)

    await user.validatePassword(currentPassword)

    user.passwordHash = newPassword
    await user.save()

    await new AuthRevocationService().revokeAllSessions(user.id, new RefreshTokenService())

    return { message: 'Password changed successfully' }
  }
}
