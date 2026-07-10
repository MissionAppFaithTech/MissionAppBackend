import { bullMQConnection } from '#config/redis'
import mail from '@adonisjs/mail/services/main'
import { Queue } from 'bullmq'

export const PASSWORD_RESET_EMAIL_QUEUE_NAME = 'password-reset-emails'
export const PASSWORD_RESET_EMAIL_JOB_NAME = 'send-password-reset-email'

export type SendPasswordResetEmailPayload = {
  fullName: string
  email: string
  resetUrl: string
  expiresInMinutes: number
}

/**
 * Fila de produção — usada por `SendPasswordResetEmailListener` para
 * enfileirar o envio sem bloquear o request HTTP que gerou o token. O
 * worker consumidor roda em processo separado (`queue:password-reset-emails-worker`).
 */
export const passwordResetEmailQueue = new Queue<SendPasswordResetEmailPayload>(
  PASSWORD_RESET_EMAIL_QUEUE_NAME,
  { connection: bullMQConnection }
)

/**
 * Envia o email de redefinição de senha — chamado pelo worker ao processar
 * um job da fila, nunca diretamente do request HTTP.
 *
 * @param payload Dados do template, capturados no momento da geração do token.
 * @returns Nada — efeito colateral (envio do email via `@adonisjs/mail`).
 * @example
 * await sendPasswordResetEmail(job.data)
 */
export async function sendPasswordResetEmail(payload: SendPasswordResetEmailPayload): Promise<void> {
  await mail.send((message) => {
    message.to(payload.email).subject('Redefinição de senha').htmlView('emails/forgot_password', payload)
  })
}
