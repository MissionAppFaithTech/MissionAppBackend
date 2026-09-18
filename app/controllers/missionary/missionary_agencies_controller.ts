import { MissionaryAgenciesService } from '#services/missionary/missionary_agencies_service'
import MissionaryAgencyTransformer from '#transformers/missionary_agency_transformer'
import { createMissionaryAgencyValidator } from '#validators/missionary/create_missionary_agency'
import { listMissionaryAgenciesValidator } from '#validators/missionary/list_missionary_agencies'
import { missionaryAgencyIdValidator } from '#validators/missionary/missionary_agency_id'
import { updateMissionaryAgencyValidator } from '#validators/missionary/update_missionary_agency'
import type { HttpContext } from '@adonisjs/core/http'

export default class MissionaryAgenciesController {
  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listMissionaryAgenciesValidator)
    const agencies = await new MissionaryAgenciesService().list(filters)

    return serialize({
      missionaryAgencies: MissionaryAgencyTransformer.transform(agencies),
    })
  }

  async show({ request, serialize }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(missionaryAgencyIdValidator)

    const agency = await new MissionaryAgenciesService().show(id)

    return serialize({
      missionaryAgency: MissionaryAgencyTransformer.transform(agency),
    })
  }

  async store({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createMissionaryAgencyValidator)

    const agency = await new MissionaryAgenciesService().create(auth.getUserOrFail(), payload)

    return serialize({
      missionaryAgency: MissionaryAgencyTransformer.transform(agency),
    })
  }

  async update({ auth, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateMissionaryAgencyValidator)

    const agency = await new MissionaryAgenciesService().update(
      auth.getUserOrFail(),
      payload.params.id,
      payload
    )

    return serialize({
      missionaryAgency: MissionaryAgencyTransformer.transform(agency),
    })
  }

  async destroy({ auth, request }: HttpContext) {
    const {
      params: { id },
    } = await request.validateUsing(missionaryAgencyIdValidator)

    await new MissionaryAgenciesService().destroy(auth.getUserOrFail(), id)

    return {
      message: 'Agência missionária removida com sucesso',
    }
  }
}
