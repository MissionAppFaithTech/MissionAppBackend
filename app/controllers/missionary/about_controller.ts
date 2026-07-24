import { UpdateMissionaryAboutService } from '#services/missionary/update_about_service'
import MissionaryTransformer from '#transformers/missionary_transformer'
import { updateAboutValidator } from '#validators/missionary/update_about'
import type { HttpContext } from '@adonisjs/core/http'

export default class AboutController {
  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateAboutValidator)
    const targetMissionaryId = request.param('id') as string | undefined

    const missionary = await new UpdateMissionaryAboutService().execute(
      auth.getUserOrFail(),
      payload,
      targetMissionaryId
    )

    return serialize({
      missionary: MissionaryTransformer.transform(missionary),
    })
  }
}
