import FaithCommunity from '#models/faith_community'
import Missionary from '#models/missionary'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { Exception } from '@adonisjs/core/exceptions'
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
        throw new Exception('Comunidade de fé informada não existe', {
          status: 422,
          code: 'E_VALIDATION_ERROR',
        })
      }
    }

    return db.transaction(async (trx) => {
      missionary.useTransaction(trx)
      missionary.merge({
        aboutMe: payload.aboutMe,
        missionStorySummary: payload.missionStorySummary,
        originLocation: payload.originLocation,
        faithCommunityId: payload.faithCommunityId,
        prayerRequest: payload.prayerRequest,
        lifeVerse: payload.lifeVerse,
      })
      await missionary.save()
      return missionary
    })
  }
}
