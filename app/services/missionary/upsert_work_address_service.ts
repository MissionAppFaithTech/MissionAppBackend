import MissionaryWorkAddress from '#models/missionary_work_address'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { ResolveMissionaryService } from './resolve_missionary_service.ts'

export type UpsertMissionaryWorkAddressPayload = {
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

    return db.transaction((trx) => this.upsert(missionary.id, payload, trx))
  }

  /**
   * Substitui o endereço de atuação dentro de uma transação já aberta, para
   * quem grava o endereço junto com outros dados do perfil.
   */
  async upsert(
    missionaryId: string,
    payload: UpsertMissionaryWorkAddressPayload,
    trx: TransactionClientContract
  ): Promise<MissionaryWorkAddress> {
    const existing = await MissionaryWorkAddress.query({ client: trx })
      .where('missionaryId', missionaryId)
      .first()

    if (existing) {
      existing.merge(payload)
      await existing.save()
      return existing
    }

    return MissionaryWorkAddress.create({ missionaryId, ...payload }, { client: trx })
  }
}
