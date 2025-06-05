import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { LoginAttemptService } from '#services/auth/login_attempt_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import { changePasswordValidator } from '#validators/user/change_password'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountPasswordController {
  async update({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, newPassword } = await request.validateUsing(changePasswordValidator)

    await user.validatePassword(currentPassword)

    user.passwordHash = newPassword
    await user.save()

    await Promise.all([
      new AuthRevocationService().revokeAllSessions(user.id, new RefreshTokenService()),
      new LoginAttemptService().recordSuccess(user),
    ])

    return { message: 'Password changed successfully' }
  }
}
