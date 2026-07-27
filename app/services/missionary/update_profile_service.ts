import type Missionary from '#models/missionary'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'

type UpdateMissionaryProfilePayload = {
  publicEmail?: string | null
  publicPhone?: string | null
  donationMessage?: string | null
}

/**
 * Atualiza os dados públicos do perfil missionário.
 */
export class UpdateMissionaryProfileService {
  async execute(
    actor: User,
    payload: UpdateMissionaryProfilePayload,
    targetMissionaryId?: string
  ): Promise<Missionary> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)

    return db.transaction(async (trx) => {
      missionary.useTransaction(trx)
      missionary.merge({
        publicEmail: payload.publicEmail,
        publicPhone: payload.publicPhone,
        donationMessage: payload.donationMessage,
      })
      await missionary.save()
      return missionary
    })
  }
}
