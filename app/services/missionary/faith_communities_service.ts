import { UserRole } from '#enums/user/user_role'
import FaithCommunityForbiddenException from '#exceptions/missionary/faith_community_forbidden_exception'
import FaithCommunityNotFoundException from '#exceptions/missionary/faith_community_not_found_exception'
import FaithCommunity from '#models/faith_community'
import type User from '#models/user'
import { applySearchFilters } from '#services/shared/apply_search_filters'
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

type CreateFaithCommunityPayload = Address & {
  name: string
  phoneNumber?: string
}

type UpdateFaithCommunityPayload = Address & {
  name?: string
  phoneNumber?: string
}

/**
 * Centraliza as operações de CRUD de comunidades de fé com controle
 * de autorização por dono do registro e permissões de administrador.
 */
export class FaithCommunitiesService {
  async list(filters: SearchFilters = {}): Promise<FaithCommunity[]> {
    return applySearchFilters(FaithCommunity.query(), filters).orderBy('name', 'asc')
  }

  async show(id: string): Promise<FaithCommunity> {
    const community = await FaithCommunity.find(id)
    if (!community) {
      throw new FaithCommunityNotFoundException('Comunidade de fé não encontrada')
    }

    return community
  }

  async create(actor: User, payload: CreateFaithCommunityPayload): Promise<FaithCommunity> {
    return db.transaction(async (trx) => {
      return FaithCommunity.create(
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
    payload: UpdateFaithCommunityPayload
  ): Promise<FaithCommunity> {
    const community = await this.show(id)

    this.assertCanManage(actor, community.userId)

    return db.transaction(async (trx) => {
      community.useTransaction(trx)
      community.merge({
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        ...this.addressOf(payload),
      })
      await community.save()
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
