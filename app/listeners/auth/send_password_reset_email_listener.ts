import { PASSWORD_RESET_EMAIL_JOB_NAME } from '#constants/password_reset'
import type PasswordResetRequested from '#events/auth/password_reset_requested'
import { emailQueue } from '#queues/email_queue'

export default class SendPasswordResetEmailListener {
  async handle(event: PasswordResetRequested): Promise<void> {
    await emailQueue.add(PASSWORD_RESET_EMAIL_JOB_NAME, { ...event })
  }
}
