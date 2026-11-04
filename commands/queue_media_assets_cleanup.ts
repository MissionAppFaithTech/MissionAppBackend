import { bullMQConnection } from '#config/redis'
import { MEDIA_ASSETS_CLEANUP_CRON_SCHEDULE } from '#constants/media_asset'
import { purgeAbandonedMediaAssets } from '#jobs/media_asset/purge_abandoned_media_assets_job'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Queue, Worker } from 'bullmq'

const QUEUE_NAME = 'media-assets-cleanup'
const JOB_NAME = 'purge-abandoned-media-assets'

export default class QueueMediaAssetsCleanup extends BaseCommand {
  static commandName = 'queue:media-assets-cleanup'
  static description = 'Inicia o worker que remove periodicamente uploads abandonados ou rejeitados'

  static options: CommandOptions = { loadApp: true }

  async run() {
    const queue = new Queue(QUEUE_NAME, { connection: bullMQConnection })

    // NOTE: `upsertJobScheduler` é idempotente pelo id do scheduler — reiniciar o
    // worker não duplica o agendamento (mesmo padrão de queue:refresh-tokens-cleanup)
    await queue.upsertJobScheduler(
      JOB_NAME,
      { pattern: MEDIA_ASSETS_CLEANUP_CRON_SCHEDULE },
      { name: JOB_NAME }
    )

    const worker = new Worker(
      QUEUE_NAME,
      async () => {
        const purgedCount = await purgeAbandonedMediaAssets()
        this.logger.info(`media assets abandonados removidos: ${purgedCount}`)
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
