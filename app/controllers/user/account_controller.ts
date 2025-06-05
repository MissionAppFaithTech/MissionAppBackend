import UserRegistered from '#events/user/user_registered'
import User from '#models/user'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import { TokenIssuanceService } from '#services/auth/token_issuance_service'
import { toDeviceMetadata } from '#utils/client_metadata'
import { signupValidator } from '#validators/user/signup'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class AccountController {
  async store({ request, serialize, auth }: HttpContext) {
    const validated = await request.validateUsing(signupValidator)

    // NOTE: passwordHash recebe o valor em texto plano — o hook beforeSave do
    // AuthFinder faz o hash automaticamente antes de persistir.
    const user = await User.create({
      fullName: validated.fullName,
      username: validated.username,
      phoneNumber: validated.phoneNumber,
      gender: validated.gender,
      email: validated.email,
      passwordHash: validated.password,
    })
    const meta = await toDeviceMetadata(request)
    const tokens = await new TokenIssuanceService().issue(
      auth,
      user,
      meta,
      new RefreshTokenService()
    )

    await UserRegistered.dispatch(user.id, user.fullName, user.email, user.role)

    return serialize({
      user: UserTransformer.transform(user),
      ...tokens,
    })
  }
}
