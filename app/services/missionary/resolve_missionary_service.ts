import MissionaryProfileForbiddenException from '#exceptions/missionary/missionary_profile_forbidden_exception'
import MissionaryProfileNotFoundException from '#exceptions/missionary/missionary_profile_not_found_exception'
import Missionary from '#models/missionary'
import type User from '#models/user'
import { UserRole } from '#enums/user/user_role'

/**
 * Resolve o perfil missionário alvo da operação respeitando escopo por role.
 */
export class ResolveMissionaryService {
  async execute(actor: User, targetMissionaryId?: string): Promise<Missionary> {
    if (actor.role === UserRole.ADMIN) {
      if (!targetMissionaryId) {
        throw new MissionaryProfileForbiddenException(
          'Admin deve informar o id do missionário alvo'
        )
      }

      const missionary = await Missionary.find(targetMissionaryId)
      if (!missionary) {
        throw new MissionaryProfileNotFoundException('Perfil missionário não encontrado')
      }

      return missionary
    }

    if (actor.role !== UserRole.MISSIONARY) {
      throw new MissionaryProfileForbiddenException(
        'Somente missionários ou administradores podem editar este perfil'
      )
    }

    const missionary = await Missionary.findBy('userId', actor.id)
    if (!missionary) {
      throw new MissionaryProfileNotFoundException(
        'Perfil missionário não encontrado para o usuário autenticado'
      )
    }

    if (targetMissionaryId && missionary.id !== targetMissionaryId) {
      throw new MissionaryProfileForbiddenException(
        'Missionário não pode editar perfil de outro missionário'
      )
    }

    return missionary
  }
}
