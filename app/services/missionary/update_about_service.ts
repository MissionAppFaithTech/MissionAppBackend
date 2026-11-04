import FaithCommunity from '#models/faith_community'
import type Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import type User from '#models/user'
import { fieldValidationError } from '#utils/field_validation_error'
import { omitUndefined } from '#utils/omit_undefined'
import db from '@adonisjs/lucid/services/db'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'
import { UpsertMissionaryWorkAddressService } from './upsert_work_address_service.ts'
import type { UpsertMissionaryWorkAddressPayload } from './upsert_work_address_service.ts'

type UpdateMissionaryAboutPayload = {
  aboutMe?: string | null
  missionStorySummary?: string | null
  originLocation?: string | null
  faithCommunityId?: string | null
  missionaryAgencyId?: string
  workAddress?: UpsertMissionaryWorkAddressPayload
  prayerRequest?: string | null
  lifeVerse?: string | null
}

/**
 * Atualiza os campos da seção "Sobre" do perfil missionário, incluindo agência
 * e local de atuação, numa única transação.
 *
 * @returns O missionário com `workAddresses`, `agency` e `faithCommunity`
 * carregados.
 */
export class UpdateMissionaryAboutService {
  async execute(
    actor: User,
    payload: UpdateMissionaryAboutPayload,
    targetMissionaryId?: string
  ): Promise<Missionary> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)

    if (payload.faithCommunityId && !(await FaithCommunity.find(payload.faithCommunityId))) {
      throw fieldValidationError(
        'faithCommunityId',
        'database.exists',
        'Comunidade de fé informada não existe'
      )
    }

    if (payload.missionaryAgencyId && !(await MissionaryAgency.find(payload.missionaryAgencyId))) {
      throw fieldValidationError(
        'missionaryAgencyId',
        'database.exists',
        'Agência missionária informada não existe'
      )
    }

    await db.transaction(async (trx) => {
      missionary.useTransaction(trx)
      missionary.merge(
        omitUndefined({
          aboutMe: payload.aboutMe,
          missionStorySummary: payload.missionStorySummary,
          originLocation: payload.originLocation,
          faithCommunityId: payload.faithCommunityId,
          missionaryAgencyId: payload.missionaryAgencyId,
          prayerRequest: payload.prayerRequest,
          lifeVerse: payload.lifeVerse,
        })
      )
      await missionary.save()

      if (payload.workAddress) {
        await new UpsertMissionaryWorkAddressService().upsert(
          missionary.id,
          payload.workAddress,
          trx
        )
      }
    })

    await missionary.load((loader) => {
      loader.load('workAddresses').load('agency').load('faithCommunity')
    })
    return missionary
  }
}
