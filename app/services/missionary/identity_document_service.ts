import type { IdentityType } from '#enums/missionary/identity_type'
import Missionary from '#models/missionary'
import { fieldValidationError } from '#utils/field_validation_error'
import { IDENTITY_DOCUMENT_TAKEN } from '#utils/identity_document'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Garante que um CPF ou passaporte (já normalizado pelo validator) pertence a
 * um único missionário. A pré-checagem dá a resposta comum; o índice único
 * `uq_missionaries_identity` garante a regra mesmo sob concorrência (ver
 * `uniqueViolationFieldError`).
 */
export class IdentityDocumentService {
  /**
   * @param type Tipo do documento.
   * @param document Documento normalizado.
   * @param exceptMissionaryId Perfil que está sendo editado (pode manter o próprio documento).
   * @param trx Transação em andamento, se houver.
   * @throws Erro de validação no campo `identityDocument` quando já está em uso.
   */
  async assertAvailable(
    type: IdentityType,
    document: string,
    exceptMissionaryId?: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    const query = Missionary.query(trx ? { client: trx } : undefined)
      .where('identity_type', type)
      .where('identity_document', document)
    if (exceptMissionaryId) query.whereNot('id', exceptMissionaryId)

    if (await query.first()) {
      throw fieldValidationError(
        'identityDocument',
        'database.unique',
        IDENTITY_DOCUMENT_TAKEN[type]
      )
    }
  }
}
