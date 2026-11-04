import QueueRefreshTokensCleanup from '../../../commands/queue_refresh_tokens_cleanup.ts'
import QueueWorkers from '../../../commands/queue_workers.ts'
import { test } from '@japa/runner'
import { spawn } from 'node:child_process'
import { once } from 'node:events'

/**
 * Sobe o worker em um processo separado, espera ele começar a escutar a fila,
 * envia SIGTERM (o que o `docker stop` faz) e devolve o exit code — ou `null`
 * se o processo não encerrou dentro do prazo.
 */
async function exitCodeAfterSigterm(commandName: string): Promise<number | null> {
  const child = spawn('node', ['ace', commandName], {
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  // NOTE: o worker consome filas reais — qualquer caminho de falha precisa
  // matá-lo, senão ele segue vivo roubando jobs de outros testes.
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${commandName} não iniciou`)), 20_000)
      child.once('exit', () => reject(new Error(`${commandName} encerrou antes de iniciar`)))
      child.stdout.on('data', (chunk: Buffer) => {
        if (chunk.toString().includes('escutando fila')) {
          clearTimeout(timer)
          resolve()
        }
      })
    })

    const exited = once(child, 'exit').then(([code]) => code as number)
    child.kill('SIGTERM')
    const timedOut = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000))
    return await Promise.race([exited, timedOut])
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
    }
  }
}

test.group('workers BullMQ — ciclo de vida', () => {
  test('{title} inicia a aplicação (Lucid, Env e DI disponíveis)')
    .with([
      { title: 'queue:workers', command: QueueWorkers },
      { title: 'queue:refresh-tokens-cleanup', command: QueueRefreshTokensCleanup },
    ])
    .run(({ assert }, { command }) => {
      assert.isTrue(command.options.startApp)
    })

  test('{$self} encerra com sucesso ao receber SIGTERM')
    .with(['queue:workers', 'queue:refresh-tokens-cleanup'])
    .run(async ({ assert }, commandName) => {
      assert.equal(await exitCodeAfterSigterm(commandName), 0)
    })
    .timeout(45_000)
})
