import type Missionary from '#models/missionary'
import type User from '#models/user'
import type { IdentityType } from '#enums/missionary/identity_type'
import db from '@adonisjs/lucid/services/db'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'

type UpdateMissionaryIdentityPayload = {
  identityType: IdentityType
  identityDocument: string
}

/**
 * Atualiza os dados de identidade do perfil missionário.
 */
export class UpdateMissionaryIdentityService {
  async execute(
    actor: User,
    payload: UpdateMissionaryIdentityPayload,
    targetMissionaryId?: string
  ): Promise<Missionary> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)

    return db.transaction(async (trx) => {
      missionary.useTransaction(trx)
      missionary.merge({
        identityType: payload.identityType,
        identityDocument: payload.identityDocument,
      })
      await missionary.save()
      return missionary
    })
  }
}
