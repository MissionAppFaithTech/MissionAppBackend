import { UserRole } from '#enums/user/user_role'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado após a criação bem-sucedida de um perfil missionário para um
 * usuário já existente, permitindo side effects assíncronos sem acoplamento
 * do fluxo HTTP à infraestrutura.
 */
export default class MissionaryProfileCreated extends BaseEvent {
  constructor(
    readonly id: string,
    readonly fullName: string,
    readonly email: string,
    readonly role: UserRole
  ) {
    super()
  }
}