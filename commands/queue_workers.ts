import { bullMQConnection } from '#config/redis'
import { workerRegistry } from '#queues/worker_registry'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { Worker } from 'bullmq'

export default class QueueWorkers extends BaseCommand {
  static commandName = 'queue:workers'
  static description = 'Inicia os workers BullMQ registrados em app/queues/worker_registry.ts'

  static options: CommandOptions = { loadApp: true }

  @flags.string({
    description: 'Processa só a fila informada (padrão: todas as registradas)',
  })
  declare only?: string

  async run() {
    const entries = this.only
      ? workerRegistry.filter((entry) => entry.queueName === this.only)
      : workerRegistry

    if (this.only && entries.length === 0) {
      this.logger.error(`fila "${this.only}" não encontrada em worker_registry.ts`)
      this.exitCode = 1
      return
    }

    // NOTE: mais de uma entrada pode compartilhar a mesma fila (ex: todos os
    // emails) — 1 Worker por fila única, processor despacha por `job.name`.
    const queueNames = [...new Set(entries.map((entry) => entry.queueName))]

    for (const queueName of queueNames) {
      const handlersByJobName = new Map(
        entries
          .filter((entry) => entry.queueName === queueName)
          .map((entry) => [entry.jobName, entry.handle])
      )

      const worker = new Worker(
        queueName,
        async (job) => {
          const handle = handlersByJobName.get(job.name)
          if (!handle) {
            throw new Error(
              `nenhum handler registrado para o job "${job.name}" na fila "${queueName}"`
            )
          }
          await handle(job.data)
        },
        { connection: bullMQConnection }
      )

      worker.on('failed', (job, err) => {
        this.logger.error(`[${queueName}] job ${job?.id} (${job?.name}) falhou: ${err.message}`)
      })

      this.logger.info(
        `worker escutando fila "${queueName}" (jobs: ${[...handlersByJobName.keys()].join(', ')})`
      )
    }

    // NOTE: mantém o processo do comando vivo enquanto os workers escutam as filas
    await new Promise(() => {})
  }
}
