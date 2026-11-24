import { DonationSettingsService } from '#services/financial_config/donation_settings_service'
import { PublicMissionaryProfileService } from '#services/missionary/public_missionary_profile_service'
import PublicDonationTransformer from '#transformers/public_donation_transformer'
import { publicMissionaryProfileValidator } from '#validators/missionary/public_missionary_profile'
import type { HttpContext } from '@adonisjs/core/http'

export default class PublicDonationsController {
  async show({ request, serialize }: HttpContext) {
    const {
      params: { username },
    } = await request.validateUsing(publicMissionaryProfileValidator)

    const missionary = await new PublicMissionaryProfileService().findByUsername(username)
    const settings = await new DonationSettingsService().read(missionary)

    return serialize({
      donation: PublicDonationTransformer.transform(settings),
    })
  }
}
