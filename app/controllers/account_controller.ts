import User from '#models/user'
import { signupValidator } from '#validators/user/signup'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class AccountController {
  async store({ request, serialize }: HttpContext) {
    const { fullName, email } = await request.validateUsing(signupValidator)

    const user = await User.create({ fullName: fullName ?? 'wip', email })
    // const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: 'wip',
    })
  }
}
