import { bullMQConnection } from '#config/redis'
import {
  COUNTER_FLUSH_INTERVAL_MS,
  COUNTER_RECONCILE_CRON_SCHEDULE,
  COUNTER_SYNC_QUEUE_NAME,
  FLUSH_COUNTERS_JOB_NAME,
  RECONCILE_COUNTERS_JOB_NAME,
} from '#constants/counter'
import { flushCounters } from '#jobs/counter/flush_counters_job'
import { reconcileCounters } from '#jobs/counter/reconcile_counters_job'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Queue, Worker } from 'bullmq'

// NOTE: o flush roda a cada 10s (~8.640 jobs/dia) — sem remoção automática o
// histórico de jobs concluídos cresceria sem limite no Dragonfly
const JOB_OPTIONS = { removeOnComplete: true, removeOnFail: 100, attempts: 1 }

export default class QueueCountersSync extends BaseCommand {
  static commandName = 'queue:counters-sync'
  static description =
    'Inicia o worker que aplica no banco os contadores bufferizados (seguidores, curtidas) e os reconcilia diariamente'

  static options: CommandOptions = { startApp: true }

  async run() {
    const queue = new Queue(COUNTER_SYNC_QUEUE_NAME, { connection: bullMQConnection })

    await queue.upsertJobScheduler(
      FLUSH_COUNTERS_JOB_NAME,
      { every: COUNTER_FLUSH_INTERVAL_MS },
      { name: FLUSH_COUNTERS_JOB_NAME, opts: JOB_OPTIONS }
    )
    await queue.upsertJobScheduler(
      RECONCILE_COUNTERS_JOB_NAME,
      { pattern: COUNTER_RECONCILE_CRON_SCHEDULE },
      { name: RECONCILE_COUNTERS_JOB_NAME, opts: JOB_OPTIONS }
    )

    // NOTE: concorrência 2 para a reconciliação (longa) não segurar os flushes;
    // o lock no Dragonfly serializa os trechos que não podem se sobrepor
    const worker = new Worker(
      COUNTER_SYNC_QUEUE_NAME,
      async (job) => {
        if (job.name === FLUSH_COUNTERS_JOB_NAME) {
          await flushCounters()
          return
        }

        if (job.name === RECONCILE_COUNTERS_JOB_NAME) {
          const fixed = await reconcileCounters()
          this.logger.info(`contadores reconciliados: ${fixed}`)
        }
      },
      { connection: bullMQConnection, concurrency: 2 }
    )

    worker.on('failed', (job, err) => {
      this.logger.error(`job ${job?.id} (${job?.name}) falhou: ${err.message}`)
    })

    this.logger.info(
      `worker escutando fila "${COUNTER_SYNC_QUEUE_NAME}" (jobs: ${FLUSH_COUNTERS_JOB_NAME}, ${RECONCILE_COUNTERS_JOB_NAME})`
    )

    this.app.terminating(async () => {
      await worker.close()
      await queue.close()
    })

    // NOTE: mantém o processo do comando vivo enquanto o worker escuta a fila
    await new Promise(() => {})
  }
}
