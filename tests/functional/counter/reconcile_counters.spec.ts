import { COUNTER_SYNC_LOCK_KEY } from '#constants/counter'
import { reconcileCounters } from '#jobs/counter/reconcile_counters_job'
import Follower from '#models/follower'
import Like from '#models/like'
import Post from '#models/post'
import cache from '#services/shared/cache/cache'
import { CounterBufferService } from '#services/shared/counter/counter_buffer_service'
import { createActiveUser, createFollowableMissionary } from '#tests/functional/user/follow_helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

const buffer = new CounterBufferService()

test.group('Counters - reconciliação', (group) => {
  group.each.setup(async () => {
    await buffer.clearAll()
    await cache.del(COUNTER_SYNC_LOCK_KEY)
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      await rollback()
      await buffer.clearAll()
    }
  })

  test('corrige contadores divergentes dos três alvos', async ({ assert }) => {
    const { user: target, missionary } = await createFollowableMissionary()
    const { user: follower } = await createActiveUser()
    const post = await Post.create({ missionaryId: missionary.id, content: 'x', slug: uuidv7() })
    await Follower.create({ followerId: follower.id, followingId: target.id })
    await Like.create({ userId: follower.id, postId: post.id })
    // NOTE: valores errados de propósito, como depois de uma reaplicação do flush
    target.followersCount = 7
    await target.save()
    post.likesCount = 4
    await post.save()

    const fixed = await reconcileCounters()

    assert.isAtLeast(fixed, 3)
    await target.refresh()
    await follower.refresh()
    await post.refresh()
    assert.equal(target.followersCount, 1)
    assert.equal(follower.followingCount, 1)
    assert.equal(post.likesCount, 1)
  })

  test('não toca em contador com delta pendente', async ({ assert }) => {
    const { user } = await createFollowableMissionary()
    user.followersCount = 5
    await user.save()
    await buffer.increment([{ target: 'userFollowers', id: user.id, delta: 1 }])

    await reconcileCounters()

    await user.refresh()
    assert.equal(user.followersCount, 5)
  })
})
