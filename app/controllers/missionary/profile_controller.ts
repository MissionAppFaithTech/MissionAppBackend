import { UpdateMissionaryProfileService } from '#services/missionary/update_profile_service'
import MissionaryTransformer from '#transformers/missionary_transformer'
import { updateProfileValidator } from '#validators/missionary/update_profile'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateProfileValidator)
    const targetMissionaryId = request.param('id') as string | undefined

    const missionary = await new UpdateMissionaryProfileService().execute(
      auth.getUserOrFail(),
      payload,
      targetMissionaryId
    )

    return serialize({
      missionary: MissionaryTransformer.transform(missionary),
    })
  }
}
