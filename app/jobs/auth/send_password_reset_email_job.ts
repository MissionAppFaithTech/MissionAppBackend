import type { PasswordResetRequestedPayload } from '#types/events/auth/password_reset_requested'
import mail from '@adonisjs/mail/services/main'

/**
 * Envia o email de redefinição de senha — chamado pelo worker ao processar
 * um job da fila, nunca diretamente do request HTTP.
 *
 * @param payload Dados do template, capturados no momento da geração do token.
 * @returns Nada — efeito colateral (envio do email via `@adonisjs/mail`).
 * @example
 * await sendPasswordResetEmail(job.data)
 */
export async function sendPasswordResetEmail(
  payload: PasswordResetRequestedPayload
): Promise<void> {
  await mail.send((message) => {
    message
      .to(payload.email)
      .subject('Redefinição de senha')
      .htmlView('emails/auth/forgot_password', payload)
  })
}
