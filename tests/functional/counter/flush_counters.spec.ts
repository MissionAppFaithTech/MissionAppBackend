import { COUNTER_SYNC_LOCK_KEY } from '#constants/counter'
import { flushCounters } from '#jobs/counter/flush_counters_job'
import Post from '#models/post'
import cache from '#services/shared/cache/cache'
import { CounterBufferService } from '#services/shared/counter/counter_buffer_service'
import { createFollowableMissionary, pendingDelta } from '#tests/functional/user/follow_helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

const buffer = new CounterBufferService()

test.group('Counters - flush', (group) => {
  group.each.setup(async () => {
    await buffer.clearAll()
    await cache.del(COUNTER_SYNC_LOCK_KEY)
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      await rollback()
      await buffer.clearAll()
    }
  })

  test('aplica os deltas no banco e limpa o buffer', async ({ assert }) => {
    const { user, missionary } = await createFollowableMissionary()
    const post = await Post.create({ missionaryId: missionary.id, content: 'x', slug: uuidv7() })
    await buffer.increment([
      { target: 'userFollowers', id: user.id, delta: 3 },
      { target: 'userFollowing', id: user.id, delta: 1 },
      { target: 'postLikes', id: post.id, delta: 2 },
    ])

    const updated = await flushCounters()

    assert.equal(updated, 3)
    await user.refresh()
    await post.refresh()
    assert.equal(user.followersCount, 3)
    assert.equal(user.followingCount, 1)
    assert.equal(post.likesCount, 2)
    assert.equal(await pendingDelta('userFollowers', user.id), 0)
  })

  test('delta negativo nunca leva o contador abaixo de zero', async ({ assert }) => {
    const { user } = await createFollowableMissionary()
    await buffer.increment([{ target: 'userFollowers', id: user.id, delta: -5 }])

    await flushCounters()

    await user.refresh()
    assert.equal(user.followersCount, 0)
  })

  test('reaplica sobra de um flush interrompido junto com o pendente novo', async ({ assert }) => {
    const { user } = await createFollowableMissionary()
    await buffer.increment([{ target: 'userFollowers', id: user.id, delta: 2 }])
    // NOTE: simula um flush que drenou e caiu antes de aplicar
    await buffer.drain('userFollowers')
    await buffer.increment([{ target: 'userFollowers', id: user.id, delta: 1 }])

    await flushCounters()

    await user.refresh()
    assert.equal(user.followersCount, 3)
  })

  test('com o lock tomado não faz nada', async ({ assert }) => {
    const { user } = await createFollowableMissionary()
    await buffer.increment([{ target: 'userFollowers', id: user.id, delta: 1 }])
    const token = await cache.acquireLock(COUNTER_SYNC_LOCK_KEY, 30)

    assert.equal(await flushCounters(), 0)
    assert.equal(await pendingDelta('userFollowers', user.id), 1)

    await cache.releaseLock(COUNTER_SYNC_LOCK_KEY, token!)
  })

  test('delta de entidade removida é descartado sem erro', async ({ assert }) => {
    const { user } = await createFollowableMissionary()
    await buffer.increment([
      { target: 'userFollowers', id: uuidv7(), delta: 1 },
      { target: 'userFollowers', id: user.id, delta: 1 },
    ])

    assert.equal(await flushCounters(), 1)
    await user.refresh()
    assert.equal(user.followersCount, 1)
  })
})
