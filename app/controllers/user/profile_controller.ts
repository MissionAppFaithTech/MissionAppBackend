import Missionary from '#models/missionary'
import { UpdateProfileService } from '#services/user/update_profile_service'
import MissionaryTransformer from '#transformers/missionary_transformer'
import MissionaryWorkAddressTransformer from '#transformers/missionary_work_address_transformer'
import UserTransformer from '#transformers/user_transformer'
import { updateProfileValidator } from '#validators/user/update_profile'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const missionary = await Missionary.query().where('userId', user.id).preload('workAddresses').first()

    return serialize({
      user: UserTransformer.transform(user),
      missionary: missionary ? MissionaryTransformer.transform(missionary) : null,
      workAddress: missionary?.workAddresses
        ? MissionaryWorkAddressTransformer.transform(missionary.workAddresses)
        : null,
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateProfileValidator)
    const updatedUser = await new UpdateProfileService().execute(user, payload)

    return serialize({
      user: UserTransformer.transform(updatedUser),
    })
  }
}
