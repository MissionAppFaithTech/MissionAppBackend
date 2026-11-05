import MissionaryAgencyForbiddenException from '#exceptions/missionary/missionary_agency_forbidden_exception'
import MissionaryAgencyInUseException from '#exceptions/missionary/missionary_agency_in_use_exception'
import MissionaryAgencyNotFoundException from '#exceptions/missionary/missionary_agency_not_found_exception'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import type User from '#models/user'
import { applySearchFilters, paginateCatalog } from '#services/shared/apply_search_filters'
import {
  canManageCatalog,
  catalogAddressOf,
  withCatalogTransaction,
} from '#services/shared/catalog_entry'
import type { CatalogAddress } from '#services/shared/catalog_entry'
import { findCatalogDuplicate } from '#services/shared/find_catalog_duplicate'
import { isForeignKeyViolation } from '#utils/postgres_errors'
import type { CatalogPage, SearchFilters } from '#services/shared/apply_search_filters'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type CreateMissionaryAgencyPayload = CatalogAddress & {
  name: string
  phoneNumber?: string
}

type UpdateMissionaryAgencyPayload = CatalogAddress & {
  name?: string
  phoneNumber?: string
}

/**
 * Centraliza as operações de CRUD de agências missionárias com controle
 * de autorização por dono do registro e permissões de administrador.
 */
export class MissionaryAgenciesService {
  /** Busca paginada por limite (ADR-0041); nunca carrega a tabela inteira. */
  async list(filters: SearchFilters = {}): Promise<CatalogPage<MissionaryAgency>> {
    return paginateCatalog(applySearchFilters(MissionaryAgency.query(), filters), filters.limit)
  }

  async show(id: string): Promise<MissionaryAgency> {
    const agency = await MissionaryAgency.find(id)
    if (!agency) {
      throw new MissionaryAgencyNotFoundException('Agência missionária não encontrada')
    }

    return agency
  }

  /**
   * Cria o registro, ou reaproveita um igual (mesmo nome e cidade). Com `trx`,
   * participa de uma transação já aberta em vez de abrir a própria.
   */
  async create(
    actor: User,
    payload: CreateMissionaryAgencyPayload,
    trx?: TransactionClientContract
  ): Promise<MissionaryAgency> {
    return withCatalogTransaction(trx, (client) => this.createWithin(actor, payload, client))
  }

  private async createWithin(
    actor: User,
    payload: CreateMissionaryAgencyPayload,
    trx: TransactionClientContract
  ): Promise<MissionaryAgency> {
    // NOTE: mesmo nome e cidade reaproveita o registro existente em vez de duplicar
    const existing = await findCatalogDuplicate(MissionaryAgency, trx, payload)
    if (existing) return existing

    return MissionaryAgency.create(
      {
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        ...catalogAddressOf(payload),
        userId: actor.id,
      },
      { client: trx }
    )
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
        ...catalogAddressOf(payload),
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

  private assertCanManage(actor: User, ownerId: string | null): void {
    if (!canManageCatalog(actor, ownerId)) {
      throw new MissionaryAgencyForbiddenException(
        'Você não tem permissão para alterar esta agência missionária'
      )
    }
  }
}
