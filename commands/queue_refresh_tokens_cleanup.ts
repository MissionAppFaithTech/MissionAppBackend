import { bullMQConnection } from '#config/redis'
import { purgeExpiredRefreshTokens } from '#jobs/auth/purge_expired_refresh_tokens_job'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Queue, Worker } from 'bullmq'

const QUEUE_NAME = 'refresh-tokens-cleanup'
const JOB_NAME = 'purge-expired-refresh-tokens'
/** Diariamente às 3h — expressão cron padrão. */
const CLEANUP_CRON_SCHEDULE = '0 3 * * *'

export default class QueueRefreshTokensCleanup extends BaseCommand {
  static commandName = 'queue:refresh-tokens-cleanup'
  static description =
    'Inicia o worker que expurga refresh_tokens expirados/revogados periodicamente'

  static options: CommandOptions = { loadApp: true }

  async run() {
    const queue = new Queue(QUEUE_NAME, { connection: bullMQConnection })

    // NOTE: repeatable job — BullMQ deduplica pelo jobId determinístico do
    // agendador, então reiniciar o worker não cria entradas duplicadas na fila.
    await queue.add(JOB_NAME, {}, { repeat: { pattern: CLEANUP_CRON_SCHEDULE } })

    const worker = new Worker(
      QUEUE_NAME,
      async () => {
        const deletedCount = await purgeExpiredRefreshTokens()
        this.logger.info(`refresh_tokens purgados: ${deletedCount}`)
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
