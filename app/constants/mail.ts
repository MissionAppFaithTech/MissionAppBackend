/**
 * Nome da fila BullMQ única que enfileira todo envio de email da aplicação
 * (redefinição de senha, boas-vindas, etc) — centralizada de propósito: ESPs
 * (Resend incluso) têm rate limit de envio compartilhado entre todos os
 * tipos de email, então a concorrência do worker precisa ser controlada num
 * lugar só, não por-tipo-de-email. O tipo específico de cada job dentro
 * dessa fila é distinguido pelo próprio `job.name` do BullMQ (ex:
 * `PASSWORD_RESET_EMAIL_JOB_NAME`, `WELCOME_EMAIL_JOB_NAME`), não por um
 * campo separado no payload.
 */
export const EMAIL_QUEUE_NAME = 'emails'
