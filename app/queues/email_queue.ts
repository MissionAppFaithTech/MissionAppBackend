import { bullMQConnection } from '#config/redis'
import { EMAIL_QUEUE_NAME } from '#constants/mail'
import type { PasswordResetRequestedPayload } from '#types/events/auth/password_reset_requested'
import type { UserRegisteredPayload } from '#types/events/user/user_registered'
import { Queue } from 'bullmq'

/**
 * Fila de produção única, compartilhada por todo email da aplicação — ver
 * `app/constants/mail.ts` pra motivo de ser uma fila só em vez de uma por
 * tipo de email. Cada listener (`SendPasswordResetEmailListener`,
 * `SendWelcomeEmailListener`) usa esta mesma instância, só variando o
 * `job.name` no `.add()`.
 */
export const emailQueue = new Queue<PasswordResetRequestedPayload | UserRegisteredPayload>(
  EMAIL_QUEUE_NAME,
  { connection: bullMQConnection }
)
