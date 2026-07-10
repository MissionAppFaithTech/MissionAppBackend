import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import SessionTransformer from '#transformers/session_transformer'
import { sessionValidator } from '#validators/user/session'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionsController {
  async index({ auth, serialize }: HttpContext) {
    const user = auth.use('jwt').getUserOrFail()
    const currentFamilyId = auth.use('jwt').currentFamilyId

    const sessions = await new RefreshTokenService().listActiveSessions(user.id)

    return serialize(SessionTransformer.transform(sessions, currentFamilyId))
  }

  async destroy({ auth, request }: HttpContext) {
    const user = auth.use('jwt').getUserOrFail()
    const {
      params: { familyId },
    } = await request.validateUsing(sessionValidator)

    const refreshTokenService = new RefreshTokenService()
    await refreshTokenService.findActiveSessionOrFail(user.id, familyId)
    await new AuthRevocationService().revokeSession(familyId, user.id, refreshTokenService)

    return { message: 'Sessão encerrada' }
  }
}
