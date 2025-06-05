import type { UserRole } from '#enums/user/user_role'
import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado após a criação bem-sucedida de uma conta — desacopla
 * `AccountController` dos efeitos colaterais do cadastro. Consumido por:
 * - `SendWelcomeEmailListener` (`app/listeners/user/send_welcome_email_listener.ts`),
 *   que enfileira o email de boas-vindas via BullMQ.
 * - `IndexMissionaryListener` (`app/listeners/user/index_missionary_listener.ts`),
 *   que enfileira a indexação no Elasticsearch quando `role === MISSIONARY`.
 */
export default class UserRegistered extends BaseEvent {
  constructor(
    readonly id: string,
    readonly fullName: string,
    readonly email: string,
    readonly role: UserRole
  ) {
    super()
  }
}
