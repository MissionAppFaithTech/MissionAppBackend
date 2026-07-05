import User from '#models/user'
import { TokenIssuanceService } from '#services/token_issuance_service'
import { signupValidator } from '#validators/user/signup'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class AccountController {
  async store(ctx: HttpContext) {
    const { request, serialize } = ctx
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    // NOTE: passwordHash recebe o valor em texto plano — o hook beforeSave do
    // AuthFinder faz o hash automaticamente antes de persistir.
    const user = await User.create({
      fullName: fullName ?? undefined,
      email,
      passwordHash: password,
    })
    const tokens = await new TokenIssuanceService().issue(ctx, user)

    return serialize({
      user: UserTransformer.transform(user),
      ...tokens,
    })
  }
}
