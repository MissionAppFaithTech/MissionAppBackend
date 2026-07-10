import { bullMQConnection } from '#config/redis'
import {
  PASSWORD_RESET_EMAIL_QUEUE_NAME,
  sendPasswordResetEmail,
  type SendPasswordResetEmailPayload,
} from '#jobs/auth/send_password_reset_email_job'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Worker } from 'bullmq'

export default class QueuePasswordResetEmailsWorker extends BaseCommand {
  static commandName = 'queue:password-reset-emails-worker'
  static description = 'Inicia o worker que envia os emails de redefinição de senha enfileirados'

  static options: CommandOptions = { loadApp: true }

  async run() {
    const worker = new Worker<SendPasswordResetEmailPayload>(
      PASSWORD_RESET_EMAIL_QUEUE_NAME,
      async (job) => {
        await sendPasswordResetEmail(job.data)
      },
      { connection: bullMQConnection }
    )

    worker.on('failed', (job, err) => {
      this.logger.error(`job ${job?.id} falhou: ${err.message}`)
    })

    // NOTE: mantém o processo do comando vivo enquanto o worker escuta a fila
    await new Promise(() => {})
  }
}
