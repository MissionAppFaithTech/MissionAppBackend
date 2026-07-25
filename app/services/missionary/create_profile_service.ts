import { UserRole } from '#enums/user/user_role'
import MissionaryProfileCreated from '#events/missionary/missionary_profile_created'
import MissionaryAgencyNotFoundException from '#exceptions/missionary/missionary_agency_not_found_exception'
import MissionaryProfileAlreadyExistsException from '#exceptions/missionary/missionary_profile_already_exists_exception'
import MissionaryProfileForbiddenException from '#exceptions/missionary/missionary_profile_forbidden_exception'
import Missionary from '#models/missionary'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { AuthRevocationService } from '#services/auth/auth_revocation_service'
import { RefreshTokenService } from '#services/auth/refresh_token_service'
import db from '@adonisjs/lucid/services/db'

type CreateMissionaryProfilePayload = {
  missionaryAgencyId: string
}

/**
 * Converte um usuário autenticado (SUPPORTER) em missionário, criando o
 * perfil estendido e sincronizando o role de autenticação de forma segura.
 */
export class CreateMissionaryProfileService {
  async execute(actor: User, payload: CreateMissionaryProfilePayload): Promise<Missionary> {
    if (actor.role !== UserRole.SUPPORTER) {
      throw new MissionaryProfileForbiddenException(
        'Somente usuários com role SUPPORTER podem converter para missionário'
      )
    }

    const existingProfile = await Missionary.findBy('userId', actor.id)
    if (existingProfile) {
      throw new MissionaryProfileAlreadyExistsException('Perfil missionário já existe para este usuário')
    }

    const agency = await MissionaryAgency.find(payload.missionaryAgencyId)
    if (!agency) {
      throw new MissionaryAgencyNotFoundException('Agência missionária não encontrada')
    }

    const missionary = await db.transaction(async (trx) => {
      actor.useTransaction(trx)
      actor.role = UserRole.MISSIONARY
      await actor.save()

      return Missionary.create(
        {
          userId: actor.id,
          missionaryAgencyId: payload.missionaryAgencyId,
        },
        { client: trx }
      )
    })

    // NOTE: role alterado invalida claims de sessão já emitidas; revogação
    // global força reautenticação com novo role no token.
    await new AuthRevocationService().revokeAllSessions(actor.id, new RefreshTokenService())

    await MissionaryProfileCreated.dispatch(actor.id, actor.fullName, actor.email, UserRole.MISSIONARY)

    return missionary
  }
}