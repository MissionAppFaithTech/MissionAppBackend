import { PublicMissionaryProfileService } from '#services/missionary/public_missionary_profile_service'
import PublicMissionaryProfileTransformer from '#transformers/public_missionary_profile_transformer'
import { publicMissionaryProfileValidator } from '#validators/missionary/public_missionary_profile'
import type { HttpContext } from '@adonisjs/core/http'

export default class PublicProfilesController {
  async show({ request, serialize }: HttpContext) {
    const {
      params: { username },
    } = await request.validateUsing(publicMissionaryProfileValidator)

    const missionary = await new PublicMissionaryProfileService().findByUsername(username)

    return serialize({
      missionary: PublicMissionaryProfileTransformer.transform(missionary),
    })
  }
}
