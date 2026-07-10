import type { UserRegisteredPayload } from '#types/events/user/user_registered'
import mail from '@adonisjs/mail/services/main'

/**
 * Envia o email de boas-vindas — chamado pelo worker ao processar um job da
 * fila, nunca diretamente do request HTTP.
 *
 * @param payload Dados do template, capturados no momento da criação da conta.
 * @returns Nada — efeito colateral (envio do email via `@adonisjs/mail`).
 * @example
 * await sendWelcomeEmail(job.data)
 */
export async function sendWelcomeEmail(payload: UserRegisteredPayload): Promise<void> {
  await mail.send((message) => {
    message.to(payload.email).subject('Bem-vindo!').htmlView('emails/user/welcome', payload)
  })
}
