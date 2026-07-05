import SessionNotFoundException from '#exceptions/session_not_found_exception'
import { AuthRevocationService } from '#services/auth_revocation_service'
import { RefreshTokenService } from '#services/refresh_token_service'
import SessionTransformer from '#transformers/session_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionsController {
  /** Lista as sessões (dispositivos) ativas do usuário autenticado. */
  async index({ auth, serialize }: HttpContext) {
    const user = auth.use('jwt').getUserOrFail()
    const currentFamilyId = auth.use('jwt').currentFamilyId

    const sessions = await new RefreshTokenService().listActiveSessions(user.id)

    return serialize(SessionTransformer.transform(sessions, currentFamilyId))
  }

  /**
   * Revoga remotamente uma sessão específica (dispositivo diferente do atual).
   * O access token daquele dispositivo é rejeitado na próxima requisição —
   * via blocklist de família no Dragonfly, sem esperar sua expiração natural.
   */
  async destroy({ auth, params }: HttpContext) {
    const user = auth.use('jwt').getUserOrFail()
    const familyId = params.familyId as string

    const refreshTokenService = new RefreshTokenService()
    const sessions = await refreshTokenService.listActiveSessions(user.id)
    const session = sessions.find((s) => s.familyId === familyId)

    if (!session) {
      throw new SessionNotFoundException('Sessão não encontrada')
    }

    await refreshTokenService.revokeFamily(familyId, user.id)
    await new AuthRevocationService().blockFamily(familyId)

    return { message: 'Sessão encerrada' }
  }
}
