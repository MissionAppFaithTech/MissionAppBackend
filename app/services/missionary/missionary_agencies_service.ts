import { UserRole } from '#enums/user/user_role'
import MissionaryAgencyForbiddenException from '#exceptions/missionary/missionary_agency_forbidden_exception'
import MissionaryAgencyInUseException from '#exceptions/missionary/missionary_agency_in_use_exception'
import MissionaryAgencyNotFoundException from '#exceptions/missionary/missionary_agency_not_found_exception'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import type User from '#models/user'
import { applySearchFilters } from '#services/shared/apply_search_filters'
import { findCatalogDuplicate } from '#services/shared/find_catalog_duplicate'
import { isForeignKeyViolation } from '#utils/postgres_errors'
import type { SearchFilters } from '#services/shared/apply_search_filters'
import db from '@adonisjs/lucid/services/db'

type Address = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  website?: string
}

type CreateMissionaryAgencyPayload = Address & {
  name: string
  phoneNumber?: string
}

type UpdateMissionaryAgencyPayload = Address & {
  name?: string
  phoneNumber?: string
}

/**
 * Centraliza as operações de CRUD de agências missionárias com controle
 * de autorização por dono do registro e permissões de administrador.
 */
export class MissionaryAgenciesService {
  async list(filters: SearchFilters = {}): Promise<MissionaryAgency[]> {
    return applySearchFilters(MissionaryAgency.query(), filters).orderBy('name', 'asc')
  }

  async show(id: string): Promise<MissionaryAgency> {
    const agency = await MissionaryAgency.find(id)
    if (!agency) {
      throw new MissionaryAgencyNotFoundException('Agência missionária não encontrada')
    }

    return agency
  }

  async create(actor: User, payload: CreateMissionaryAgencyPayload): Promise<MissionaryAgency> {
    return db.transaction(async (trx) => {
      // NOTE: mesmo nome e cidade reaproveita o registro existente em vez de duplicar
      const existing = await findCatalogDuplicate(MissionaryAgency, trx, payload)
      if (existing) return existing

      return MissionaryAgency.create(
        {
          name: payload.name,
          phoneNumber: payload.phoneNumber,
          ...this.addressOf(payload),
          userId: actor.id,
        },
        { client: trx }
      )
    })
  }

  async update(
    actor: User,
    id: string,
    payload: UpdateMissionaryAgencyPayload
  ): Promise<MissionaryAgency> {
    const agency = await this.show(id)

    this.assertCanManage(actor, agency.userId)

    return db.transaction(async (trx) => {
      agency.useTransaction(trx)
      agency.merge({
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        ...this.addressOf(payload),
      })
      await agency.save()
      return agency
    })
  }

  /**
   * Remove a agência. Missionários vinculados impedem a exclusão (a FK é
   * `ON DELETE RESTRICT`): responde 409 em vez de deixar o banco virar 500.
   *
   * @throws {MissionaryAgencyInUseException} Ainda há missionários vinculados.
   */
  async destroy(actor: User, id: string): Promise<void> {
    const agency = await this.show(id)

    this.assertCanManage(actor, agency.userId)

    try {
      await db.transaction(async (trx) => {
        const linked = await Missionary.query({ client: trx })
          .where('missionaryAgencyId', agency.id)
          .first()
        if (linked) throw this.inUse()

        agency.useTransaction(trx)
        await agency.delete()
      })
    } catch (error) {
      // NOTE: um missionário vinculado entre a checagem e o delete cai aqui.
      if (isForeignKeyViolation(error)) throw this.inUse()
      throw error
    }
  }

  private inUse(): MissionaryAgencyInUseException {
    return new MissionaryAgencyInUseException(
      'Esta agência missionária tem missionários vinculados e não pode ser excluída'
    )
  }

  private addressOf(payload: Address): Address {
    return {
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      postalCode: payload.postalCode,
      website: payload.website,
    }
  }

  private assertCanManage(actor: User, ownerId: string | null): void {
    if (actor.role === UserRole.ADMIN) {
      return
    }

    if (!ownerId || ownerId !== actor.id) {
      throw new MissionaryAgencyForbiddenException(
        'Você não tem permissão para alterar esta agência missionária'
      )
    }
  }
}
