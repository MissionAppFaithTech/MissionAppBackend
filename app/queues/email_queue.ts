import { bullMQConnection } from '#config/redis'
import { EMAIL_QUEUE_NAME } from '#constants/mail'
import type { PASSWORD_RESET_EMAIL_JOB_NAME } from '#constants/password_reset'
import type { WELCOME_EMAIL_JOB_NAME } from '#constants/welcome_email'
import type { PasswordResetRequestedPayload } from '#types/events/auth/password_reset_requested'
import type { UserRegisteredPayload } from '#types/events/user/user_registered'
import { Queue } from 'bullmq'

/**
 * Fila de produção única, compartilhada por todo email da aplicação — ver
 * `app/constants/mail.ts` pra motivo de ser uma fila só em vez de uma por
 * tipo de email. Cada listener (`SendPasswordResetEmailListener`,
 * `SendWelcomeEmailListener`) usa esta mesma instância, só variando o
 * `job.name` no `.add()`.
 *
 * NameType é explicitado pois o BullMQ v6 não reduz mais sozinho o tipo
 * default de `job.name` quando `DataTypeOrJob` é uma união.
 */
export const emailQueue = new Queue<
  PasswordResetRequestedPayload | UserRegisteredPayload,
  void,
  typeof PASSWORD_RESET_EMAIL_JOB_NAME | typeof WELCOME_EMAIL_JOB_NAME
>(EMAIL_QUEUE_NAME, { connection: bullMQConnection })
