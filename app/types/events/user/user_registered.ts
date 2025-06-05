import type UserRegistered from '#events/user/user_registered'

/**
 * Formato dos dados carregados pelo evento `UserRegistered` — derivado da
 * própria classe (não redeclarado), usado pelo job/worker de envio
 * (`app/jobs/user/send_welcome_email_job.ts`,
 * `commands/queue_welcome_emails_worker.ts`) para nunca driftar do payload
 * real que o evento carrega.
 */
export type UserRegisteredPayload = InstanceType<typeof UserRegistered>
