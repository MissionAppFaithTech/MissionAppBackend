import { UpdateMissionaryIdentityService } from '#services/missionary/update_identity_service'
import MissionaryTransformer from '#transformers/missionary_transformer'
import { updateIdentityValidator } from '#validators/missionary/update_identity'
import type { HttpContext } from '@adonisjs/core/http'

export default class IdentityController {
  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateIdentityValidator)
    const targetMissionaryId = request.param('id') as string | undefined

    const missionary = await new UpdateMissionaryIdentityService().execute(
      auth.getUserOrFail(),
      payload,
      targetMissionaryId
    )

    return serialize({
      missionary: MissionaryTransformer.transform(missionary),
    })
  }
}
