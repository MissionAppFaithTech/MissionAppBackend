import { ChangeEmailService } from '#services/user/change_email_service'
import UserTransformer from '#transformers/user_transformer'
import { changeEmailValidator } from '#validators/user/change_email'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountEmailController {
  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(changeEmailValidator)
    const updatedUser = await new ChangeEmailService().execute(user, payload)

    return serialize({
      user: UserTransformer.transform(updatedUser),
    })
  }
}
