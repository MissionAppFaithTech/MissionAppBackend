import { PasswordResetService } from '#services/auth/password_reset_service'
import { forgotPasswordValidator } from '#validators/user/forgot_password'
import type { HttpContext } from '@adonisjs/core/http'

export default class ForgotPasswordController {
  async store({ request }: HttpContext) {
    const { login } = await request.validateUsing(forgotPasswordValidator)

    await new PasswordResetService().requestReset(login)

    return {
      message:
        'Se o email informado estiver cadastrado, você receberá instruções de redefinição de senha.',
    }
  }
}
