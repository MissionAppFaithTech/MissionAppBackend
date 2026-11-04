import cache from '#services/shared/cache/cache'
import { test } from '@japa/runner'
import { setTimeout as sleep } from 'node:timers/promises'
import { v7 as uuidv7 } from 'uuid'

test.group('CacheClient', () => {
  test('incrWithInitialTtl() aplica TTL na primeira criação da chave', async ({ assert }) => {
    const key = `tests:cache:incr-with-initial-ttl:first:${uuidv7()}`

    const attempts = await cache.incrWithInitialTtl(key, 1)

    assert.equal(attempts, 1)

    await sleep(1_100)

    assert.isFalse(await cache.exists(key))
  })

  test('incrWithInitialTtl() recupera contador sem TTL após falha anterior', async ({ assert }) => {
    const key = `tests:cache:incr-with-initial-ttl:recovery:${uuidv7()}`

    await cache.incr(key)
    const attempts = await cache.incrWithInitialTtl(key, 1)

    assert.equal(attempts, 2)

    await sleep(1_100)

    assert.isFalse(await cache.exists(key))
  })
})
