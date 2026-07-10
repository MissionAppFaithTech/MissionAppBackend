import User from '#models/user'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import { TokenIssuanceService } from '#services/auth/token_issuance_service'
import { toDeviceMetadata } from '#utils/client_metadata'
import { refreshValidator } from '#validators/user/refresh'
import type { HttpContext } from '@adonisjs/core/http'

export default class RefreshTokensController {
  async store({ request, serialize, auth }: HttpContext) {
    const validated = await request.validateUsing(refreshValidator)
    const meta = await toDeviceMetadata(request)

    const { userId, newRaw, familyId } = await new RefreshTokenService().rotate(
      validated.refreshToken,
      meta
    )

    const user = await User.findOrFail(userId)
    const tokens = await new TokenIssuanceService().deliver(auth, user, newRaw, familyId)

    return serialize(tokens)
  }
}
