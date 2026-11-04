import FaithCommunity from '#models/faith_community'
import type Missionary from '#models/missionary'
import type User from '#models/user'
import { fieldValidationError } from '#utils/field_validation_error'
import { omitUndefined } from '#utils/omit_undefined'
import db from '@adonisjs/lucid/services/db'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'

type UpdateMissionaryAboutPayload = {
  aboutMe?: string | null
  missionStorySummary?: string | null
  originLocation?: string | null
  faithCommunityId?: string | null
  prayerRequest?: string | null
  lifeVerse?: string | null
}

/**
 * Atualiza os campos da seção "Sobre" do perfil missionário.
 */
export class UpdateMissionaryAboutService {
  async execute(
    actor: User,
    payload: UpdateMissionaryAboutPayload,
    targetMissionaryId?: string
  ): Promise<Missionary> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)

    if (payload.faithCommunityId) {
      const community = await FaithCommunity.find(payload.faithCommunityId)
      if (!community) {
        throw fieldValidationError(
          'faithCommunityId',
          'database.exists',
          'Comunidade de fé informada não existe'
        )
      }
    }

    return db.transaction(async (trx) => {
      missionary.useTransaction(trx)
      missionary.merge(
        omitUndefined({
          aboutMe: payload.aboutMe,
          missionStorySummary: payload.missionStorySummary,
          originLocation: payload.originLocation,
          faithCommunityId: payload.faithCommunityId,
          prayerRequest: payload.prayerRequest,
          lifeVerse: payload.lifeVerse,
        })
      )
      await missionary.save()
      return missionary
    })
  }
}
