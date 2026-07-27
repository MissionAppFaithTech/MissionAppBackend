import { UpsertMissionaryWorkAddressService } from '#services/missionary/upsert_work_address_service'
import MissionaryWorkAddressTransformer from '#transformers/missionary_work_address_transformer'
import { updateWorkAddressValidator } from '#validators/missionary/update_work_address'
import type { HttpContext } from '@adonisjs/core/http'

export default class WorkAddressController {
  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateWorkAddressValidator)
    const targetMissionaryId = request.param('id') as string | undefined

    const workAddress = await new UpsertMissionaryWorkAddressService().execute(
      auth.getUserOrFail(),
      payload,
      targetMissionaryId
    )

    return serialize({
      workAddress: MissionaryWorkAddressTransformer.transform(workAddress),
    })
  }
}
