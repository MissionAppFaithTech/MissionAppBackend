import { BaseEvent } from '@adonisjs/core/events'

/**
 * Disparado quando um token de redefinição de senha é gerado e precisa ser
 * entregue por email — desacopla `PasswordResetService` do envio em si.
 * Consumido por `SendPasswordResetEmailListener`
 * (`app/listeners/auth/send_password_reset_email_listener.ts`), que enfileira
 * o envio via BullMQ em vez de mandar o email de dentro do request HTTP.
 */
export default class PasswordResetRequested extends BaseEvent {
  constructor(
    readonly fullName: string,
    readonly email: string,
    readonly resetUrl: string,
    readonly expiresInMinutes: number
  ) {
    super()
  }
}
