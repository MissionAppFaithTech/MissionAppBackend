import { clientMetadata } from '#auth/client_context'
import InvalidRefreshTokenException from '#exceptions/invalid_refresh_token_exception'
import User from '#models/user'
import { RefreshTokenService } from '#services/refresh_token_service'
import { TokenIssuanceService } from '#services/token_issuance_service'
import { refreshValidator } from '#validators/user/refresh'
import type { HttpContext } from '@adonisjs/core/http'

export default class RefreshTokensController {
  async store(ctx: HttpContext) {
    const { request, serialize } = ctx
    const { refreshToken } = await request.validateUsing(refreshValidator)

    try {
      const { userId, newRaw, familyId } = await new RefreshTokenService().rotate(
        refreshToken,
        clientMetadata(ctx)
      )
      const user = await User.findOrFail(userId)
      const tokens = await new TokenIssuanceService().deliver(ctx, user, newRaw, familyId)

      return serialize(tokens)
    } catch (error) {
      if (error instanceof InvalidRefreshTokenException) throw error
      throw new InvalidRefreshTokenException('Refresh token inválido')
    }
  }
}
