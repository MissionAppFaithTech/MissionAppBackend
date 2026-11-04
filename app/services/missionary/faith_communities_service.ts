import { UserRole } from '#enums/user/user_role'
import FaithCommunityForbiddenException from '#exceptions/missionary/faith_community_forbidden_exception'
import FaithCommunityNotFoundException from '#exceptions/missionary/faith_community_not_found_exception'
import FaithCommunity from '#models/faith_community'
import Pastor from '#models/pastor'
import type User from '#models/user'
import { applySearchFilters } from '#services/shared/apply_search_filters'
import { findCatalogDuplicate } from '#services/shared/find_catalog_duplicate'
import type { SearchFilters } from '#services/shared/apply_search_filters'
import { fieldValidationError } from '#utils/field_validation_error'
import { omitUndefined } from '#utils/omit_undefined'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { HasManyQueryBuilderContract } from '@adonisjs/lucid/types/relations'

type Address = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  website?: string
}

type PastorFields = {
  pastorName?: string | null
  pastorPhone?: string | null
}

type CreateFaithCommunityPayload = Address &
  PastorFields & {
    name: string
    phoneNumber?: string
  }

type UpdateFaithCommunityPayload = Address &
  PastorFields & {
    name?: string
    phoneNumber?: string
  }

const pastorsInCreationOrder = (query: HasManyQueryBuilderContract<typeof Pastor, any>) =>
  query.orderBy('created_at', 'asc')

/**
 * Centraliza as operações de CRUD de comunidades de fé com controle
 * de autorização por dono do registro e permissões de administrador.
 */
export class FaithCommunitiesService {
  async list(filters: SearchFilters = {}): Promise<FaithCommunity[]> {
    return applySearchFilters(FaithCommunity.query(), filters)
      .preload('pastors', pastorsInCreationOrder)
      .orderBy('name', 'asc')
  }

  async show(id: string): Promise<FaithCommunity> {
    const community = await FaithCommunity.query()
      .where('id', id)
      .preload('pastors', pastorsInCreationOrder)
      .first()
    if (!community) {
      throw new FaithCommunityNotFoundException('Comunidade de fé não encontrada')
    }

    return community
  }

  /**
   * Cria o registro, ou reaproveita um igual (mesmo nome e cidade). Com `trx`,
   * participa de uma transação já aberta em vez de abrir a própria.
   */
  async create(
    actor: User,
    payload: CreateFaithCommunityPayload,
    trx?: TransactionClientContract
  ): Promise<FaithCommunity> {
    return trx
      ? this.createWithin(actor, payload, trx)
      : db.transaction((own) => this.createWithin(actor, payload, own))
  }

  private async createWithin(
    actor: User,
    payload: CreateFaithCommunityPayload,
    trx: TransactionClientContract
  ): Promise<FaithCommunity> {
    // NOTE: mesmo nome e cidade reaproveita o registro existente em vez de duplicar
    const existing = await findCatalogDuplicate(FaithCommunity, trx, payload)
    if (existing) {
      await existing.load('pastors', pastorsInCreationOrder)
      return existing
    }

    const community = await FaithCommunity.create(
      {
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        ...this.addressOf(payload),
        userId: actor.id,
      },
      { client: trx }
    )
    await this.syncPastor(community, payload, trx)
    return community
  }

  async update(
    actor: User,
    id: string,
    payload: UpdateFaithCommunityPayload
  ): Promise<FaithCommunity> {
    const community = await this.show(id)

    this.assertCanManage(actor, community.userId)

    return db.transaction(async (trx) => {
      community.useTransaction(trx)
      community.merge(
        omitUndefined({
          name: payload.name,
          phoneNumber: payload.phoneNumber,
          ...this.addressOf(payload),
        })
      )
      await community.save()
      await this.syncPastor(community, payload, trx)
      return community
    })
  }

  async destroy(actor: User, id: string): Promise<void> {
    const community = await this.show(id)

    this.assertCanManage(actor, community.userId)

    await db.transaction(async (trx) => {
      community.useTransaction(trx)
      await community.delete()
    })
  }

  /**
   * Mantém um único pastor por comunidade a partir dos campos planos
   * `pastorName`/`pastorPhone`, e deixa a relação `pastors` carregada.
   */
  private async syncPastor(
    community: FaithCommunity,
    payload: PastorFields,
    trx: TransactionClientContract
  ): Promise<void> {
    if (payload.pastorName !== undefined || payload.pastorPhone !== undefined) {
      const current = await Pastor.query({ client: trx })
        .where('faith_community_id', community.id)
        .orderBy('created_at', 'asc')
        .first()

      if (payload.pastorName === null) {
        await current?.delete()
      } else if (current) {
        current.merge(
          omitUndefined({ fullName: payload.pastorName, phoneNumber: payload.pastorPhone })
        )
        await current.save()
      } else if (payload.pastorName) {
        await Pastor.create(
          {
            faithCommunityId: community.id,
            fullName: payload.pastorName,
            phoneNumber: payload.pastorPhone ?? null,
          },
          { client: trx }
        )
      } else {
        // NOTE: `pastors.full_name` é NOT NULL — telefone sozinho não cria pastor
        throw fieldValidationError(
          'pastorName',
          'required',
          'Informe o nome do pastor junto com o telefone'
        )
      }
    }

    await community.load('pastors', pastorsInCreationOrder)
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
      throw new FaithCommunityForbiddenException(
        'Você não tem permissão para alterar esta comunidade de fé'
      )
    }
  }
}
