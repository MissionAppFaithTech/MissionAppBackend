import Follower from '#models/follower'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import {
  createActiveUser,
  createFollowableMissionary,
  followUrl,
} from '#tests/functional/user/follow_helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { v7 as uuidv7 } from 'uuid'

/** Grava follows direto no banco com `created_at` crescente (o último é o mais recente). */
async function seedFollows(pairs: Array<{ followerId: string; followingId: string }>) {
  const base = DateTime.now().minus({ hours: 1 })
  for (const [index, pair] of pairs.entries()) {
    await Follower.create({ ...pair, createdAt: base.plus({ minutes: index }) })
  }
}

test.group('Follows - listas de seguidores e seguindo', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('lista seguidores do mais recente ao mais antigo, paginando por cursor', async ({
    client,
    assert,
  }) => {
    const { user: target } = await createFollowableMissionary()
    const followers = [await createActiveUser(), await createActiveUser(), await createActiveUser()]
    await seedFollows(
      followers.map(({ user }) => ({ followerId: user.id, followingId: target.id }))
    )

    const { user: viewer, password } = followers[0]
    const token = await loginAs(client, viewer, password)

    const first = await client
      .get(followUrl.followers(target.id))
      .qs({ limit: 2 })
      .bearerToken(token)
    first.assertStatus(200)
    const firstBody = first.body() as ApiBody
    assert.deepEqual(
      firstBody.data.followers.map((item: any) => item.id),
      [followers[2].user.id, followers[1].user.id]
    )
    assert.containsSubset(firstBody.data.followers[0], {
      username: followers[2].user.username,
      fullName: followers[2].user.fullName,
      profilePictureUrl: null,
      role: 'SUPPORTER',
    })
    assert.isString(firstBody.data.followers[0].followedAt)
    assert.isTrue(firstBody.meta!.hasMore)

    const second = await client
      .get(followUrl.followers(target.id))
      .qs({ limit: 2, cursor: firstBody.meta!.nextCursor })
      .bearerToken(token)
    const secondBody = second.body() as ApiBody
    assert.deepEqual(
      secondBody.data.followers.map((item: any) => item.id),
      [followers[0].user.id]
    )
    assert.deepEqual(secondBody.meta, { nextCursor: null, hasMore: false })
  })

  test('lista quem o usuário segue e oculta contas removidas', async ({ client, assert }) => {
    const { user, password } = await createActiveUser()
    const { user: kept } = await createFollowableMissionary()
    const { user: removed } = await createFollowableMissionary()
    await seedFollows([
      { followerId: user.id, followingId: kept.id },
      { followerId: user.id, followingId: removed.id },
    ])
    removed.deletedAt = DateTime.now()
    await removed.save()

    const token = await loginAs(client, user, password)
    const response = await client.get(followUrl.following(user.id)).bearerToken(token)

    response.assertStatus(200)
    assert.deepEqual(
      (response.body() as ApiBody).data.following.map((item: any) => item.id),
      [kept.id]
    )
  })

  test('cursor inválido responde 422', async ({ client }) => {
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const response = await client
      .get(followUrl.followers(user.id))
      .qs({ cursor: 'invalido' })
      .bearerToken(token)

    response.assertStatus(422)
    response.assertBodyContains({ code: 'E_INVALID_CURSOR' })
  })

  test('usuário inexistente responde 404 e sem token responde 401', async ({ client }) => {
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const missing = await client.get(followUrl.following(uuidv7())).bearerToken(token)
    missing.assertStatus(404)
    missing.assertBodyContains({ code: 'E_USER_NOT_FOUND' })

    const anonymous = await client.get(followUrl.followers(user.id))
    anonymous.assertStatus(401)
  })
})
