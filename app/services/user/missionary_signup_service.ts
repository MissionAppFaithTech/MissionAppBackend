import type { IdentityType } from '#enums/missionary/identity_type'
import type { Gender } from '#enums/user/gender'
import { UserRole } from '#enums/user/user_role'
import UserRegistered from '#events/user/user_registered'
import FaithCommunity from '#models/faith_community'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { FaithCommunitiesService } from '#services/missionary/faith_communities_service'
import { MissionaryAgenciesService } from '#services/missionary/missionary_agencies_service'
import { fieldValidationError } from '#utils/field_validation_error'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'

type CatalogItemPayload = {
  name: string
  phoneNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  website?: string
}

type MissionarySignupPayload = {
  fullName: string
  username: string
  phoneNumber: string
  gender: Gender
  email: string
  password: string
  birthDate: DateTime
  identityType?: IdentityType
  identityDocument?: string
  aboutMe?: string
  missionaryAgencyId?: string
  missionaryAgency?: CatalogItemPayload
  faithCommunityId?: string
  faithCommunity?: CatalogItemPayload & { pastorName?: string; pastorPhone?: string }
}

/**
 * Cadastra um missionário numa única transação: conta já com role
 * MISSIONARY, perfil missionário e, quando o candidato não encontra a sua no
 * catálogo, a agência e a comunidade de fé novas (registradas em nome dele).
 * Uma falha em qualquer etapa desfaz tudo — não sobra conta pela metade.
 *
 * @returns O usuário criado e o perfil com `agency`, `faithCommunity` e
 * `workAddresses` carregados.
 */
export class MissionarySignupService {
  async execute(payload: MissionarySignupPayload): Promise<{ user: User; missionary: Missionary }> {
    this.assertSingleChoice(payload)

    const result = await db.transaction(async (trx) => {
      // NOTE: passwordHash recebe o valor em texto plano — o hook beforeSave do
      // AuthFinder faz o hash automaticamente antes de persistir.
      const user = await User.create(
        {
          fullName: payload.fullName,
          username: payload.username,
          phoneNumber: payload.phoneNumber,
          gender: payload.gender,
          email: payload.email,
          passwordHash: payload.password,
          birthDate: payload.birthDate,
          role: UserRole.MISSIONARY,
        },
        { client: trx }
      )
      // NOTE: `create` não relê os defaults do banco (`membershipStatus`,
      // `biography`...); sem o refresh a resposta e o JWT saem incompletos
      await user.refresh()

      const missionaryAgencyId = await this.resolveAgency(user, payload, trx)
      const faithCommunityId = await this.resolveFaithCommunity(user, payload, trx)

      const missionary = await Missionary.create(
        {
          userId: user.id,
          missionaryAgencyId,
          faithCommunityId,
          identityType: payload.identityType ?? null,
          identityDocument: payload.identityDocument ?? null,
          aboutMe: payload.aboutMe ?? null,
        },
        { client: trx }
      )

      return { user, missionary }
    })

    await result.missionary.refresh()
    await result.missionary.load((loader) => {
      loader.load('agency').load('faithCommunity').load('workAddresses')
    })

    // NOTE: só UserRegistered — com role MISSIONARY ele já envia o e-mail de
    // boas-vindas e indexa o missionário; MissionaryProfileCreated indexaria de novo
    await UserRegistered.dispatch(
      result.user.id,
      result.user.fullName,
      result.user.email,
      result.user.role
    )

    return result
  }

  private assertSingleChoice(payload: MissionarySignupPayload): void {
    const agencyChoices = [payload.missionaryAgencyId, payload.missionaryAgency].filter(Boolean)
    if (agencyChoices.length !== 1) {
      throw fieldValidationError(
        'missionaryAgencyId',
        'required',
        'Informe uma agência do catálogo (missionaryAgencyId) ou os dados de uma nova (missionaryAgency)'
      )
    }

    if (payload.faithCommunityId && payload.faithCommunity) {
      throw fieldValidationError(
        'faithCommunityId',
        'exclusive',
        'Informe a comunidade do catálogo ou os dados de uma nova, não os dois'
      )
    }
  }

  private async resolveAgency(
    user: User,
    payload: MissionarySignupPayload,
    trx: TransactionClientContract
  ): Promise<string> {
    if (payload.missionaryAgency) {
      const agency = await new MissionaryAgenciesService().create(
        user,
        payload.missionaryAgency,
        trx
      )
      return agency.id
    }

    const agency = await MissionaryAgency.find(payload.missionaryAgencyId!, { client: trx })
    if (!agency) {
      throw fieldValidationError(
        'missionaryAgencyId',
        'database.exists',
        'Agência missionária informada não existe'
      )
    }
    return agency.id
  }

  private async resolveFaithCommunity(
    user: User,
    payload: MissionarySignupPayload,
    trx: TransactionClientContract
  ): Promise<string | null> {
    if (payload.faithCommunity) {
      const community = await new FaithCommunitiesService().create(
        user,
        payload.faithCommunity,
        trx
      )
      return community.id
    }

    if (!payload.faithCommunityId) return null

    const community = await FaithCommunity.find(payload.faithCommunityId, { client: trx })
    if (!community) {
      throw fieldValidationError(
        'faithCommunityId',
        'database.exists',
        'Comunidade de fé informada não existe'
      )
    }
    return community.id
  }
}
