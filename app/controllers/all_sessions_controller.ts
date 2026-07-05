import { AuthRevocationService } from '#services/auth_revocation_service'
import { RefreshTokenService } from '#services/refresh_token_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class AllSessionsController {
  async destroy({ auth }: HttpContext) {
    const user = auth.use('jwt').getUserOrFail()

    await new AuthRevocationService().revokeAllSessions(user.id, new RefreshTokenService())

    return { message: 'Todas as sessões foram encerradas' }
  }
}
