import Missionary from '#models/missionary'
import { UpdateProfileService } from '#services/user/update_profile_service'
import CatalogReferenceTransformer from '#transformers/catalog_reference_transformer'
import UserTransformer from '#transformers/user_transformer'
import { missionaryProfilePayload } from '#utils/missionary_profile_payload'
import { updateProfileValidator } from '#validators/user/update_profile'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load((loader) => {
      loader.load('profilePicture').load('faithCommunity')
    })
    const missionary = await Missionary.query()
      .where('userId', user.id)
      .preload('workAddresses')
      .preload('agency')
      .preload('faithCommunity')
      .first()

    return serialize({
      user: UserTransformer.transform(user),
      ...missionaryProfilePayload(missionary, user.faithCommunity),
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateProfileValidator)
    const updatedUser = await new UpdateProfileService().execute(user, payload)

    return serialize({
      user: UserTransformer.transform(updatedUser),
      faithCommunity: updatedUser.faithCommunity
        ? CatalogReferenceTransformer.transform(updatedUser.faithCommunity)
        : null,
    })
  }
}
