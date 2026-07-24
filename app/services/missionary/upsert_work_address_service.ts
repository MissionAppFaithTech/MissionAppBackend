import MissionaryWorkAddress from '#models/missionary_work_address'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'

type UpsertMissionaryWorkAddressPayload = {
  zip: string
  district: string
  city: string
  state: string
  country: string
}

/**
 * Cria ou atualiza o endereço de atuação do missionário.
 */
export class UpsertMissionaryWorkAddressService {
  async execute(
    actor: User,
    payload: UpsertMissionaryWorkAddressPayload,
    targetMissionaryId?: string
  ): Promise<MissionaryWorkAddress> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)

    return db.transaction(async (trx) => {
      const existing = await MissionaryWorkAddress.query({ client: trx })
        .where('missionaryId', missionary.id)
        .first()

      if (existing) {
        existing.merge(payload)
        await existing.save()
        return existing
      }

      return MissionaryWorkAddress.create(
        {
          missionaryId: missionary.id,
          ...payload,
        },
        { client: trx }
      )
    })
  }
}
