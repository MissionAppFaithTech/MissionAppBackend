import Follower from '#models/follower'
import Post from '#models/post'
import type User from '#models/user'
import { createActiveMissionary, createActiveSupporter } from '#tests/functional/follower/helpers'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const feedUrl = () => router.builder().make('v1.feeds.index')!

async function publish(missionaryId: string, content: string) {
  return Post.create({ missionaryId, content, slug: `${content}-${missionaryId.slice(-8)}` })
}

async function follow(follower: User, following: User) {
  await Follower.create({ followerId: follower.id, followingId: following.id })
}

function contents(body: ApiBody): string[] {
  return body.data.posts.map((post: any) => post.content)
}

test.group('Feed', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('missionário vê as próprias e as de quem segue, conforme o scope', async ({
    client,
    assert,
  }) => {
    const me = await createActiveMissionary()
    const followed = await createActiveMissionary()
    const stranger = await createActiveMissionary()
    await follow(me.user, followed.user)

    await publish(me.missionary.id, 'minha')
    await publish(followed.missionary.id, 'seguido')
    await publish(stranger.missionary.id, 'estranho')

    const token = await loginAs(client, me.user, me.password)

    const all = await client.get(feedUrl()).bearerToken(token)
    all.assertStatus(200)
    assert.sameMembers(contents(all.body() as ApiBody), ['minha', 'seguido'])

    const following = await client.get(feedUrl()).qs({ scope: 'following' }).bearerToken(token)
    assert.deepEqual(contents(following.body() as ApiBody), ['seguido'])

    const own = await client.get(feedUrl()).qs({ scope: 'own' }).bearerToken(token)
    assert.deepEqual(contents(own.body() as ApiBody), ['minha'])
  })

  test('apoiador vê só as de quem segue, com o autor de cada postagem', async ({
    client,
    assert,
  }) => {
    const supporter = await createActiveSupporter()
    const followed = await createActiveMissionary()
    await follow(supporter.user, followed.user)
    await publish(followed.missionary.id, 'novidade')

    const token = await loginAs(client, supporter.user, supporter.password)

    const all = await client.get(feedUrl()).bearerToken(token)
    const [post] = (all.body() as ApiBody).data.posts
    assert.equal(post.content, 'novidade')
    assert.deepEqual(post.author, {
      username: followed.user.username,
      fullName: followed.user.fullName,
      profilePictureUrl: null,
    })
    assert.deepEqual(post.images, [])

    const own = await client.get(feedUrl()).qs({ scope: 'own' }).bearerToken(token)
    own.assertStatus(200)
    assert.deepEqual((own.body() as ApiBody).data.posts, [])
  })

  test('mais recentes primeiro e paginado por cursor', async ({ client, assert }) => {
    const supporter = await createActiveSupporter()
    const followed = await createActiveMissionary()
    await follow(supporter.user, followed.user)
    for (const content of ['p1', 'p2', 'p3']) {
      await publish(followed.missionary.id, content)
    }

    const token = await loginAs(client, supporter.user, supporter.password)

    const first = await client.get(feedUrl()).qs({ limit: 2 }).bearerToken(token)
    const firstBody = first.body() as ApiBody
    assert.deepEqual(contents(firstBody), ['p3', 'p2'])
    assert.isTrue(firstBody.meta!.hasMore)

    const second = await client
      .get(feedUrl())
      .qs({ limit: 2, cursor: firstBody.meta!.nextCursor })
      .bearerToken(token)
    assert.deepEqual(contents(second.body() as ApiBody), ['p1'])
    assert.isFalse((second.body() as ApiBody).meta!.hasMore)
  })

  test('postagens de missionário excluído saem do feed', async ({ client, assert }) => {
    const supporter = await createActiveSupporter()
    const followed = await createActiveMissionary()
    await follow(supporter.user, followed.user)
    await publish(followed.missionary.id, 'antiga')

    followed.user.deletedAt = followed.user.createdAt
    await followed.user.save()

    const token = await loginAs(client, supporter.user, supporter.password)
    const response = await client.get(feedUrl()).bearerToken(token)

    assert.deepEqual((response.body() as ApiBody).data.posts, [])
  })

  test('recusa scope desconhecido', async ({ client }) => {
    const supporter = await createActiveSupporter()
    const token = await loginAs(client, supporter.user, supporter.password)

    const response = await client.get(feedUrl()).qs({ scope: 'todos' }).bearerToken(token)

    response.assertStatus(422)
    response.assertBodyContains({ code: 'E_VALIDATION_ERROR' })
  })

  test('exige autenticação', async ({ client }) => {
    const response = await client.get(feedUrl())
    response.assertStatus(401)
  })
})
