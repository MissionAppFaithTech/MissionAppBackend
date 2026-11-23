import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { UserRole } from '#enums/user/user_role'
import Follower from '#models/follower'
import User from '#models/user'
import { createActiveMissionary, createActiveSupporter } from '#tests/functional/follower/helpers'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const url = {
  index: () => router.builder().make('v1.followings.index')!,
  store: () => router.builder().make('v1.followings.store')!,
  show: (username: string) => router.builder().params({ username }).make('v1.followings.show')!,
  destroy: (username: string) =>
    router.builder().params({ username }).make('v1.followings.destroy')!,
  followers: () => router.builder().make('v1.followers.index')!,
}

async function counters(userId: string) {
  const user = await User.findOrFail(userId)
  return { followers: user.followersCount, following: user.followingCount }
}

test.group('Followers - seguir e deixar de seguir', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('apoiador segue missionário, lista, consulta e deixa de seguir', async ({
    client,
    assert,
  }) => {
    const { user: supporter, password } = await createActiveSupporter()
    const { user: missionary, password: missionaryPassword } = await createActiveMissionary()
    const token = await loginAs(client, supporter, password)

    const store = await client
      .post(url.store())
      .bearerToken(token)
      .json({ username: missionary.username!.toUpperCase() })

    store.assertStatus(200)
    store.assertBodyContains({ data: { following: true } })
    assert.deepEqual(await counters(supporter.id), { followers: 0, following: 1 })
    assert.deepEqual(await counters(missionary.id), { followers: 1, following: 0 })

    // NOTE: seguir de novo não duplica a linha nem os contadores
    const again = await client
      .post(url.store())
      .bearerToken(token)
      .json({ username: missionary.username })
    again.assertStatus(200)
    assert.lengthOf(await Follower.query().where('followerId', supporter.id), 1)
    assert.deepEqual(await counters(missionary.id), { followers: 1, following: 0 })

    const show = await client.get(url.show(missionary.username!)).bearerToken(token)
    show.assertBodyContains({ data: { following: true } })

    const index = await client.get(url.index()).bearerToken(token)
    index.assertStatus(200)
    const following = (index.body() as ApiBody).data.following
    assert.lengthOf(following, 1)
    assert.equal(following[0].username, missionary.username)
    assert.equal(following[0].role, UserRole.MISSIONARY)
    assert.isString(following[0].followedAt)
    assert.notProperty(following[0], 'email')

    const missionaryToken = await loginAs(client, missionary, missionaryPassword)
    const followers = await client.get(url.followers()).bearerToken(missionaryToken)
    followers.assertStatus(200)
    assert.deepEqual(
      (followers.body() as ApiBody).data.followers.map((row: any) => row.username),
      [supporter.username]
    )

    const destroy = await client.delete(url.destroy(missionary.username!)).bearerToken(token)
    destroy.assertStatus(200)
    destroy.assertBodyContains({ data: { following: false } })
    assert.deepEqual(await counters(supporter.id), { followers: 0, following: 0 })
    assert.deepEqual(await counters(missionary.id), { followers: 0, following: 0 })

    // NOTE: deixar de seguir quem não se segue é idempotente e não decrementa
    const destroyAgain = await client.delete(url.destroy(missionary.username!)).bearerToken(token)
    destroyAgain.assertStatus(200)
    assert.deepEqual(await counters(missionary.id), { followers: 0, following: 0 })
  })

  test('missionário segue outro missionário', async ({ client, assert }) => {
    const { user: follower, password } = await createActiveMissionary()
    const { user: followed } = await createActiveMissionary()
    const token = await loginAs(client, follower, password)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ username: followed.username })

    response.assertStatus(200)
    assert.deepEqual(await counters(followed.id), { followers: 1, following: 0 })
  })

  test('não segue apoiador nem missionário fora do ar: {label}')
    .with([
      { label: 'apoiador', target: 'supporter' },
      { label: 'missionário pendente de aprovação', target: 'pending' },
      { label: 'username inexistente', target: 'missing' },
    ] as const)
    .run(async ({ client, assert }, row) => {
      const { user, password } = await createActiveSupporter()
      const token = await loginAs(client, user, password)

      let username = 'nao_existe_123'
      if (row.target === 'supporter') {
        const supporter = await createActiveSupporter()
        username = supporter.user.username!
      } else if (row.target === 'pending') {
        const pending = await createActiveMissionary()
        pending.missionary.status = MissionaryStatus.PENDING_APPROVAL
        await pending.missionary.save()
        username = pending.user.username!
      }

      const response = await client.post(url.store()).bearerToken(token).json({ username })

      response.assertStatus(404)
      response.assertBodyContains({ code: 'E_FOLLOWED_USER_NOT_FOUND' })
      assert.lengthOf(await Follower.query().where('followerId', user.id), 0)
    })

  test('não segue a si mesmo', async ({ client }) => {
    const { user, password } = await createActiveMissionary()
    const token = await loginAs(client, user, password)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ username: user.username })

    response.assertStatus(422)
    response.assertBodyContains({ code: 'E_FOLLOW_SELF' })
  })

  test('administrador não segue perfis', async ({ client }) => {
    const { user, password } = await createActiveSupporter()
    user.role = UserRole.ADMIN
    await user.save()
    const { user: missionary } = await createActiveMissionary()
    const token = await loginAs(client, user, password)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ username: missionary.username })

    response.assertStatus(403)
    response.assertBodyContains({ code: 'E_FOLLOW_FORBIDDEN' })
  })

  test('missionário suspenso some de "seguindo" sem desfazer o vínculo', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createActiveSupporter()
    const { user: missionary } = await createActiveMissionary()
    const token = await loginAs(client, user, password)
    await client.post(url.store()).bearerToken(token).json({ username: missionary.username })

    missionary.deletedAt = missionary.createdAt
    await missionary.save()

    const index = await client.get(url.index()).bearerToken(token)
    assert.lengthOf((index.body() as ApiBody).data.following, 0)
    assert.lengthOf(await Follower.query().where('followerId', user.id), 1)
  })

  test('pagina "seguindo" por cursor', async ({ client, assert }) => {
    const { user, password } = await createActiveSupporter()
    const token = await loginAs(client, user, password)
    const missionaries = [
      await createActiveMissionary(),
      await createActiveMissionary(),
      await createActiveMissionary(),
    ]
    for (const { user: missionary } of missionaries) {
      await client.post(url.store()).bearerToken(token).json({ username: missionary.username })
    }

    const first = await client.get(url.index()).qs({ limit: 2 }).bearerToken(token)
    const firstBody = first.body() as ApiBody
    assert.lengthOf(firstBody.data.following, 2)
    assert.isTrue(firstBody.meta!.hasMore)

    const second = await client
      .get(url.index())
      .qs({ limit: 2, cursor: firstBody.meta!.nextCursor })
      .bearerToken(token)
    const secondBody = second.body() as ApiBody
    assert.lengthOf(secondBody.data.following, 1)
    assert.isFalse(secondBody.meta!.hasMore)

    // NOTE: mais recentes primeiro — o primeiro seguido é o último da lista
    assert.equal(secondBody.data.following[0].username, missionaries[0].user.username)
  })

  test('exige autenticação', async ({ client }) => {
    const response = await client.get(url.index())
    response.assertStatus(401)
  })
})
