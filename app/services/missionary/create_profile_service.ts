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
import { isUniqueViolation } from '#utils/postgres_errors'
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
    if (existingProfile) throw this.alreadyExists()

    const agency = await MissionaryAgency.find(payload.missionaryAgencyId)
    if (!agency) {
      throw new MissionaryAgencyNotFoundException('Agência missionária não encontrada')
    }

    const missionary = await this.convert(actor, payload.missionaryAgencyId)

    // NOTE: role alterado invalida claims de sessão já emitidas; revogação
    // global força reautenticação com novo role no token.
    await new AuthRevocationService().revokeAllSessions(actor.id, new RefreshTokenService())

    await MissionaryProfileCreated.dispatch(
      actor.id,
      actor.fullName,
      actor.email,
      UserRole.MISSIONARY
    )

    return missionary
  }

  /**
   * Troca o role e cria o perfil numa transação que trava a linha do usuário:
   * conversões simultâneas esperam a primeira terminar e respondem 409, em vez
   * de baterem na `uq_missionaries_user_id` e virarem 500.
   */
  private async convert(actor: User, missionaryAgencyId: string): Promise<Missionary> {
    try {
      return await db.transaction(async (trx) => {
        await User.query({ client: trx }).where('id', actor.id).forUpdate().firstOrFail()
        const existing = await Missionary.query({ client: trx }).where('userId', actor.id).first()
        if (existing) throw this.alreadyExists()

        actor.useTransaction(trx)
        actor.role = UserRole.MISSIONARY
        await actor.save()

        return Missionary.create({ userId: actor.id, missionaryAgencyId }, { client: trx })
      })
    } catch (error) {
      if (isUniqueViolation(error, 'uq_missionaries_user_id')) throw this.alreadyExists()
      throw error
    }
  }

  private alreadyExists(): MissionaryProfileAlreadyExistsException {
    return new MissionaryProfileAlreadyExistsException(
      'Perfil missionário já existe para este usuário'
    )
  }
}
