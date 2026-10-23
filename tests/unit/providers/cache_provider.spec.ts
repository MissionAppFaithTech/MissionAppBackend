import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import CacheProvider from '../../../providers/cache_provider.ts'

test.group('CacheProvider', () => {
  test('shutdown() não falha quando o cache nunca foi resolvido', async ({ assert }) => {
    const provider = new CacheProvider(app)

    await assert.doesNotReject(() => provider.shutdown())
  })

  test('comandos Ace que iniciam a app encerram sozinhos (conexão com o Dragonfly é fechada)', async ({
    assert,
  }) => {
    // NOTE: sem o shutdown() o socket do ioredis mantém o processo vivo e o
    // execFile é morto pelo timeout (killed = true)
    const killed = await promisify(execFile)('node', ['ace', 'migration:status'], {
      env: { ...process.env, NO_COLOR: '1' },
      timeout: 20_000,
      // NOTE: SIGKILL — o processo testado é justamente um que pode ignorar
      // SIGTERM; sem isso uma falha deixaria um `node ace` órfão para sempre.
      killSignal: 'SIGKILL',
    })
      .then(() => false)
      .catch((error: { killed: boolean }) => error.killed)

    assert.isFalse(killed)
  }).timeout(30_000)
})
