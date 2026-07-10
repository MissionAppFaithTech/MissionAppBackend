import { WELCOME_EMAIL_JOB_NAME } from '#constants/welcome_email'
import type UserRegistered from '#events/user/user_registered'
import { emailQueue } from '#queues/email_queue'

export default class SendWelcomeEmailListener {
  async handle(event: UserRegistered): Promise<void> {
    await emailQueue.add(WELCOME_EMAIL_JOB_NAME, { ...event })
  }
}
