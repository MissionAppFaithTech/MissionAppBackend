import type FaithCommunity from '#models/faith_community'
import Missionary from '#models/missionary'
import type MissionaryAgency from '#models/missionary_agency'
import { UpdateProfileService } from '#services/user/update_profile_service'
import CatalogReferenceTransformer from '#transformers/catalog_reference_transformer'
import MissionaryTransformer from '#transformers/missionary_transformer'
import MissionaryWorkAddressTransformer from '#transformers/missionary_work_address_transformer'
import UserTransformer from '#transformers/user_transformer'
import { updateProfileValidator } from '#validators/user/update_profile'
import type { HttpContext } from '@adonisjs/core/http'

const EMPTY_MISSIONARY_PROFILE = {
  missionary: null,
  workAddress: null,
  missionaryAgency: null,
  faithCommunity: null,
}

function catalogReference(item: MissionaryAgency | FaithCommunity | null | undefined) {
  return item ? CatalogReferenceTransformer.transform(item) : null
}

/** Perfil missionário serializado, com as referências de catálogo (id + nome). */
function missionaryProfile(missionary: Missionary | null) {
  if (!missionary) return EMPTY_MISSIONARY_PROFILE

  const { workAddresses } = missionary
  return {
    missionary: MissionaryTransformer.transform(missionary),
    workAddress: workAddresses ? MissionaryWorkAddressTransformer.transform(workAddresses) : null,
    missionaryAgency: catalogReference(missionary.agency),
    faithCommunity: catalogReference(missionary.faithCommunity),
  }
}

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const missionary = await Missionary.query()
      .where('userId', user.id)
      .preload('workAddresses')
      .preload('agency')
      .preload('faithCommunity')
      .first()

    return serialize({
      user: UserTransformer.transform(user),
      ...missionaryProfile(missionary),
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
