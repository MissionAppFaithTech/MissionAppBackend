import type PasswordResetRequested from '#events/password_reset_requested'
import {
  passwordResetEmailQueue,
  PASSWORD_RESET_EMAIL_JOB_NAME,
} from '#jobs/auth/send_password_reset_email_job'

export default class SendPasswordResetEmailListener {
  async handle(event: PasswordResetRequested): Promise<void> {
    await passwordResetEmailQueue.add(PASSWORD_RESET_EMAIL_JOB_NAME, {
      fullName: event.fullName,
      email: event.email,
      resetUrl: event.resetUrl,
      expiresInMinutes: event.expiresInMinutes,
    })
  }
}
