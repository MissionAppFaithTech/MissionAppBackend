import User from '#models/user'
import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import { TokenIssuanceService } from '#services/auth/token_issuance_service'
import UserTransformer from '#transformers/user_transformer'
import { toDeviceMetadata } from '#utils/client_metadata'
import { loginValidator } from '#validators/user/login'
import { refreshValidator } from '#validators/user/refresh'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccessTokensController {
  async store({ request, serialize, auth }: HttpContext) {
    const validated = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(validated.login, validated.password)
    const meta = await toDeviceMetadata(request)

    const tokens = await new TokenIssuanceService().issue(
      auth,
      user,
      meta,
      new RefreshTokenService()
    )

    return serialize({
      ...tokens,
      user: UserTransformer.transform(user),
    })
  }

  async destroy({ request, auth }: HttpContext) {
    const { refreshToken } = await request.validateUsing(refreshValidator)

    await new AuthRevocationService().logout(auth, refreshToken, new RefreshTokenService())

    return {
      message: 'Logged out successfully',
    }
  }
}
