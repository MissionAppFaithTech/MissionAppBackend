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

  test('hincrby() acumula deltas e hmget() devolve null para campos ausentes', async ({
    assert,
  }) => {
    const key = `tests:cache:hash:${uuidv7()}`

    await cache.hincrby(key, 'a', 2)
    await cache.hincrby(key, 'a', -1)

    assert.deepEqual(await cache.hmget(key, ['a', 'b']), ['1', null])
    assert.deepEqual(await cache.hmget(key, []), [])

    await cache.del(key)
  })

  test('drainHashInto() move o hash ativo para o de processamento', async ({ assert }) => {
    const source = `tests:cache:drain:source:${uuidv7()}`
    const destination = `tests:cache:drain:destination:${uuidv7()}`

    await cache.hincrby(source, 'a', 3)

    const entries = await cache.drainHashInto(source, destination)

    assert.deepEqual(entries, [['a', 3]])
    assert.isFalse(await cache.exists(source))
    assert.isTrue(await cache.exists(destination))

    await cache.hincrby(source, 'a', 1)
    assert.deepEqual(await cache.hmget(destination, ['a']), ['3'])

    await cache.del(source)
    await cache.del(destination)
  })

  test('drainHashInto() soma na sobra de processamento em vez de sobrescrever', async ({
    assert,
  }) => {
    const source = `tests:cache:drain:source:${uuidv7()}`
    const destination = `tests:cache:drain:destination:${uuidv7()}`

    await cache.hincrby(destination, 'a', 2)
    await cache.hincrby(source, 'a', 1)
    await cache.hincrby(source, 'b', -1)

    const entries = await cache.drainHashInto(source, destination)

    assert.sameDeepMembers(entries, [
      ['a', 3],
      ['b', -1],
    ])
    assert.isFalse(await cache.exists(source))

    await cache.del(destination)
  })

  test('drainHashInto() sem nada pendente devolve lista vazia', async ({ assert }) => {
    const entries = await cache.drainHashInto(
      `tests:cache:drain:source:${uuidv7()}`,
      `tests:cache:drain:destination:${uuidv7()}`
    )

    assert.deepEqual(entries, [])
  })

  test('acquireLock() é exclusivo e releaseLock() exige o token do dono', async ({ assert }) => {
    const key = `tests:cache:lock:${uuidv7()}`

    const token = await cache.acquireLock(key, 10)
    assert.isString(token)
    assert.isNull(await cache.acquireLock(key, 10))

    await cache.releaseLock(key, 'outro-token')
    assert.isTrue(await cache.exists(key))

    await cache.releaseLock(key, token!)
    assert.isFalse(await cache.exists(key))
  })
})
