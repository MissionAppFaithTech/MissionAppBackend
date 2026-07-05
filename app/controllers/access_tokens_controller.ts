import User from '#models/user'
import { AuthRevocationService } from '#services/auth_revocation_service'
import { RefreshTokenService } from '#services/refresh_token_service'
import { TokenIssuanceService } from '#services/token_issuance_service'
import UserTransformer from '#transformers/user_transformer'
import { loginValidator } from '#validators/user/login'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccessTokensController {
  async store(ctx: HttpContext) {
    const { request, serialize } = ctx
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)
    const tokens = await new TokenIssuanceService().issue(ctx, user)

    return serialize({
      ...tokens,
      user: UserTransformer.transform(user),
    })
  }

  /**
   * Logout do dispositivo/sessão atual apenas — bloqueia o access token
   * corrente e revoga só a família de refresh token de origem, não todas as
   * sessões do usuário. Para logout em todos os dispositivos, ver
   * `AllSessionsController#destroy` (DELETE /auth/sessions).
   */
  async destroy(ctx: HttpContext) {
    const guard = ctx.auth.use('jwt')
    const user = guard.getUserOrFail()
    const jti = guard.currentJti
    const exp = guard.currentTokenExpiresAt
    const familyId = guard.currentFamilyId

    if (jti && exp) {
      const ttlSeconds = exp - Math.floor(Date.now() / 1000)
      await new AuthRevocationService().blockJti(jti, ttlSeconds)
    }

    if (familyId) {
      await new RefreshTokenService().revokeFamily(familyId, user.id)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
