import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { UserRole } from '#enums/user/user_role'
import Follower from '#models/follower'
import cache from '#services/shared/cache/cache'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'
import {
  createActiveUser,
  createFollowableMissionary,
  followUrl,
  pendingDelta,
} from '#tests/functional/user/follow_helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

test.group('Follows - seguir e deixar de seguir', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('apoiador segue missionário e o contador já reflete antes do flush', async ({
    client,
    assert,
  }) => {
    const { user: target } = await createFollowableMissionary()
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const response = await client.post(followUrl.store(target.id)).bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual((response.body() as ApiBody).data.follow, {
      following: true,
      followersCount: 1,
    })
    assert.equal(await pendingDelta('userFollowers', target.id), 1)
    assert.equal(
      await pendingDelta('userFollowing', user.id),
      1,
      'following do seguidor também recebe delta'
    )

    const rows = await Follower.query().where('followerId', user.id).where('followingId', target.id)
    assert.lengthOf(rows, 1)
  })

  test('seguir de novo não duplica a relação nem o delta', async ({ client, assert }) => {
    const { user: target } = await createFollowableMissionary()
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    await client.post(followUrl.store(target.id)).bearerToken(token)
    const again = await client.post(followUrl.store(target.id)).bearerToken(token)

    again.assertStatus(200)
    assert.equal((again.body() as ApiBody).data.follow.followersCount, 1)
    assert.equal(await pendingDelta('userFollowers', target.id), 1)
  })

  test('deixar de seguir é idempotente e zera o delta líquido', async ({ client, assert }) => {
    const { user: target } = await createFollowableMissionary()
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    await client.post(followUrl.store(target.id)).bearerToken(token)
    const first = await client.delete(followUrl.destroy(target.id)).bearerToken(token)
    const second = await client.delete(followUrl.destroy(target.id)).bearerToken(token)

    first.assertStatus(200)
    second.assertStatus(200)
    assert.deepEqual((second.body() as ApiBody).data.follow, {
      following: false,
      followersCount: 0,
    })
    assert.equal(await pendingDelta('userFollowers', target.id), 0)
  })

  test('missionário e admin também podem seguir', async ({ client, assert }) => {
    const { user: target } = await createFollowableMissionary()
    const { user: missionary, password: missionaryPassword } = await createFollowableMissionary()
    const { user: admin, password: adminPassword } = await createActiveUser(UserRole.ADMIN)

    for (const [user, password] of [
      [missionary, missionaryPassword],
      [admin, adminPassword],
    ] as const) {
      const token = await loginAs(client, user, password)
      const response = await client.post(followUrl.store(target.id)).bearerToken(token)
      response.assertStatus(200)
    }

    assert.equal(await pendingDelta('userFollowers', target.id), 2)
  })

  test('não permite seguir a si mesmo', async ({ client }) => {
    const { user, password } = await createFollowableMissionary()
    const token = await loginAs(client, user, password)

    const response = await client.post(followUrl.store(user.id)).bearerToken(token)

    response.assertStatus(422)
    response.assertBodyContains({ code: 'E_CANNOT_FOLLOW_SELF' })
  })

  test('só missionário público pode ser seguido; o resto é 404', async ({ client }) => {
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const { user: supporter } = await createActiveUser()
    const pending = await createFollowableMissionary()
    pending.missionary.status = MissionaryStatus.PENDING_APPROVAL
    await pending.missionary.save()

    for (const id of [supporter.id, pending.user.id, uuidv7()]) {
      const response = await client.post(followUrl.store(id)).bearerToken(token)
      response.assertStatus(404)
      response.assertBodyContains({ code: 'E_USER_NOT_FOUND' })
    }
  })

  test('exige autenticação', async ({ client }) => {
    const { user: target } = await createFollowableMissionary()

    const response = await client.post(followUrl.store(target.id))

    response.assertStatus(401)
  })

  test('show informa se quem está vendo segue o perfil', async ({ client, assert }) => {
    const { user: target } = await createFollowableMissionary()
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const before = await client.get(followUrl.show(target.id)).bearerToken(token)
    await client.post(followUrl.store(target.id)).bearerToken(token)
    const after = await client.get(followUrl.show(target.id)).bearerToken(token)

    before.assertStatus(200)
    assert.isFalse((before.body() as ApiBody).data.follow.following)
    assert.deepEqual((after.body() as ApiBody).data.follow, { following: true, followersCount: 1 })
  })

  test('perfil público soma o delta pendente aos contadores', async ({ client, assert }) => {
    const { user: target } = await createFollowableMissionary()
    // NOTE: o username gerado pelo helper passa do limite aceito pela rota pública
    target.username = `m_${uuidv7().replaceAll('-', '').slice(-12)}`
    await target.save()
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)
    await client.post(followUrl.store(target.id)).bearerToken(token)

    const profile = await client
      .get(
        router.builder().params({ username: target.username }).make('v1.public.missionaries.show')!
      )
      .header('X-Forwarded-For', uniqueClientIp())

    profile.assertStatus(200)
    assert.equal((profile.body() as ApiBody).data.missionary.followersCount, 1)
    assert.equal((profile.body() as ApiBody).data.missionary.id, target.id)
  })

  test('limita ações em sequência por usuário', async ({ client }) => {
    const { user: target } = await createFollowableMissionary()
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)
    await cache.set(`rate_limit:engagement:user:${user.id}`, '120', 60)

    const response = await client.post(followUrl.store(target.id)).bearerToken(token)

    response.assertStatus(429)
    response.assertHeader('retry-after', '60')
    response.assertBodyContains({ code: 'E_TOO_MANY_REQUESTS' })
  })
})
