import { DonationSettingsService } from '#services/financial_config/donation_settings_service'
import DonationSettingsTransformer from '#transformers/donation_settings_transformer'
import { updateDonationSettingsValidator } from '#validators/financial_config/update_donation_settings'
import { missionaryIdValidator } from '#validators/missionary/missionary_id'
import type { HttpContext } from '@adonisjs/core/http'

export default class DonationSettingsController {
  async show({ auth, request, serialize }: HttpContext) {
    const {
      params: { id: targetMissionaryId },
    } = await request.validateUsing(missionaryIdValidator)

    const settings = await new DonationSettingsService().show(
      auth.getUserOrFail(),
      targetMissionaryId
    )

    return serialize({
      donationSettings: DonationSettingsTransformer.transform(settings),
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateDonationSettingsValidator)
    const {
      params: { id: targetMissionaryId },
    } = await request.validateUsing(missionaryIdValidator)

    const settings = await new DonationSettingsService().update(
      auth.getUserOrFail(),
      payload,
      targetMissionaryId
    )

    return serialize({
      donationSettings: DonationSettingsTransformer.transform(settings),
    })
  }
}
