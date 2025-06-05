import type PasswordResetRequested from '#events/auth/password_reset_requested'

/**
 * Formato dos dados carregados pelo evento `PasswordResetRequested` —
 * derivado da própria classe (não redeclarado), usado pelo job/worker de
 * envio (`app/jobs/auth/send_password_reset_email_job.ts`,
 * `commands/queue_password_reset_emails_worker.ts`) para nunca driftar do
 * payload real que o evento carrega.
 */
export type PasswordResetRequestedPayload = InstanceType<typeof PasswordResetRequested>
