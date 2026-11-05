import type Missionary from '#models/missionary'
import type User from '#models/user'
import type { IdentityType } from '#enums/missionary/identity_type'
import { IdentityDocumentService } from '#services/missionary/identity_document_service'
import { uniqueViolationFieldError } from '#utils/unique_violation_field_error'
import db from '@adonisjs/lucid/services/db'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'

type UpdateMissionaryIdentityPayload = {
  identityType: IdentityType
  /** Já normalizado pelo validator (`identityDocument`). */
  identityDocument: string
}

/**
 * Atualiza os dados de identidade do perfil missionário. O documento não pode
 * pertencer a outro missionário (`uq_missionaries_identity`).
 */
export class UpdateMissionaryIdentityService {
  async execute(
    actor: User,
    payload: UpdateMissionaryIdentityPayload,
    targetMissionaryId?: string
  ): Promise<Missionary> {
    const missionary = await new ResolveMissionaryService().execute(actor, targetMissionaryId)
    await new IdentityDocumentService().assertAvailable(
      payload.identityType,
      payload.identityDocument,
      missionary.id
    )

    try {
      return await db.transaction(async (trx) => {
        missionary.useTransaction(trx)
        missionary.merge({
          identityType: payload.identityType,
          identityDocument: payload.identityDocument,
        })
        await missionary.save()
        return missionary
      })
    } catch (error) {
      // NOTE: outra requisição pode ter salvo o mesmo documento depois da pré-checagem
      throw uniqueViolationFieldError(error, payload.identityType) ?? error
    }
  }
}
