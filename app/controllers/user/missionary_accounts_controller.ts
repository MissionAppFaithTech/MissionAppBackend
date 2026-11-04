import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import { TokenIssuanceService } from '#services/auth/token_issuance_service'
import { MissionarySignupService } from '#services/user/missionary_signup_service'
import UserTransformer from '#transformers/user_transformer'
import { toDeviceMetadata } from '#utils/client_metadata'
import { missionaryProfilePayload } from '#utils/missionary_profile_payload'
import { missionarySignupValidator } from '#validators/user/missionary_signup'
import type { HttpContext } from '@adonisjs/core/http'

export default class MissionaryAccountsController {
  async store({ request, serialize, auth }: HttpContext) {
    const payload = await request.validateUsing(missionarySignupValidator)
    // NOTE: headers inválidos respondem 422 antes de criar a conta; depois disso
    // a nova tentativa falharia com "e-mail já em uso".
    const meta = await toDeviceMetadata(request)

    const { user, missionary } = await new MissionarySignupService().execute(payload)
    const tokens = await new TokenIssuanceService().issue(
      auth,
      user,
      meta,
      new RefreshTokenService(),
      new AuthRevocationService()
    )

    return serialize({
      user: UserTransformer.transform(user),
      ...missionaryProfilePayload(missionary),
      ...tokens,
    })
  }
}
