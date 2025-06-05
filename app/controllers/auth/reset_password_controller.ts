import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { PasswordResetService } from '#services/auth/password_reset_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import { resetPasswordValidator } from '#validators/user/reset_password'
import type { HttpContext } from '@adonisjs/core/http'

export default class ResetPasswordController {
  async update({ request }: HttpContext) {
    const { token, newPassword } = await request.validateUsing(resetPasswordValidator)

    await new PasswordResetService().resetPassword(
      token,
      newPassword,
      new RefreshTokenService(),
      new AuthRevocationService()
    )

    return { message: 'Senha redefinida com sucesso.' }
  }
}
