import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { MembershipStatus } from '#enums/user/membership_status'
import { UserRole } from '#enums/user/user_role'
import MissionaryProfileNotFoundException from '#exceptions/missionary/missionary_profile_not_found_exception'
import Missionary from '#models/missionary'

/**
 * Leitura anônima do perfil público de missionário (RF 1.4, RF 10, ADR-0036).
 */
export class PublicMissionaryProfileService {
  /**
   * Busca o perfil público visível de um missionário pelo username.
   *
   * Só é visível quem tem papel `MISSIONARY`, perfil `APPROVED`, conta `ACTIVE`
   * e não foi excluído. Qualquer outro caso responde o mesmo 404, para não
   * revelar se o username existe.
   *
   * @param username Username já normalizado (minúsculo, sem espaços).
   * @returns Missionário com usuário, agência, comunidade e endereço carregados.
   * @throws {MissionaryProfileNotFoundException} Perfil inexistente ou não público.
   * @example
   * const missionary = await new PublicMissionaryProfileService().findByUsername('samuel_m')
   */
  async findByUsername(username: string): Promise<Missionary> {
    const missionary = await Missionary.query()
      .where('status', MissionaryStatus.APPROVED)
      .whereHas('user', (user) => {
        user
          .where('username', username)
          .where('role', UserRole.MISSIONARY)
          .where('membershipStatus', MembershipStatus.ACTIVE)
          .whereNull('deletedAt')
      })
      .preload('user')
      .preload('agency')
      .preload('faithCommunity')
      .preload('workAddresses')
      .first()

    if (!missionary) {
      throw new MissionaryProfileNotFoundException('Perfil de missionário não encontrado')
    }

    return missionary
  }
}
