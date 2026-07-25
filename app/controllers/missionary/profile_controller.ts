import { CreateMissionaryProfileService } from '#services/missionary/create_profile_service'
import { UpdateMissionaryProfileService } from '#services/missionary/update_profile_service'
import MissionaryTransformer from '#transformers/missionary_transformer'
import { createMissionaryProfileValidator } from '#validators/missionary/create_profile'
import { updateProfileValidator } from '#validators/missionary/update_profile'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async store({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMissionaryProfileValidator)

    const missionary = await new CreateMissionaryProfileService().execute(auth.getUserOrFail(), payload)

    return serialize({
      missionary: MissionaryTransformer.transform(missionary),
      message: 'Perfil missionário criado com sucesso. Faça login novamente para aplicar o novo role.',
    })
  }

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
