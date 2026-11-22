import Post from '#models/post'
import { loginAs } from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import {
  createActiveUser,
  createFollowableMissionary,
  pendingDelta,
} from '#tests/functional/user/follow_helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

const url = {
  like: (id: string) => router.builder().params({ id }).make('v1.post_likes.store')!,
  unlike: (id: string) => router.builder().params({ id }).make('v1.post_likes.destroy')!,
  index: () => router.builder().make('v1.posts.index')!,
  show: (id: string) => router.builder().params({ id }).make('v1.posts.show')!,
}

async function createPost(missionaryId: string, content = 'Notícias do campo') {
  return Post.create({ missionaryId, content, slug: `post-${uuidv7()}` })
}

test.group('Posts - curtidas', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('curtir e descurtir são idempotentes e o contador inclui o delta pendente', async ({
    client,
    assert,
  }) => {
    const { missionary } = await createFollowableMissionary()
    const post = await createPost(missionary.id)
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const like = await client.post(url.like(post.id)).bearerToken(token)
    const again = await client.post(url.like(post.id)).bearerToken(token)

    like.assertStatus(200)
    assert.deepEqual((again.body() as ApiBody).data.like, { liked: true, likesCount: 1 })
    assert.equal(await pendingDelta('postLikes', post.id), 1)

    await client.delete(url.unlike(post.id)).bearerToken(token)
    const unlikeAgain = await client.delete(url.unlike(post.id)).bearerToken(token)

    unlikeAgain.assertStatus(200)
    assert.deepEqual((unlikeAgain.body() as ApiBody).data.like, { liked: false, likesCount: 0 })
  })

  test('post inexistente responde 404', async ({ client }) => {
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)

    const response = await client.post(url.like(uuidv7())).bearerToken(token)

    response.assertStatus(404)
    response.assertBodyContains({ code: 'E_POST_NOT_FOUND' })
  })

  test('listagem e detalhe marcam isLiked só nos posts curtidos por quem vê', async ({
    client,
    assert,
  }) => {
    const { missionary } = await createFollowableMissionary()
    const liked = await createPost(missionary.id, 'Curtido')
    const other = await createPost(missionary.id, 'Não curtido')
    const { user, password } = await createActiveUser()
    const token = await loginAs(client, user, password)
    await client.post(url.like(liked.id)).bearerToken(token)

    const index = await client
      .get(url.index())
      .qs({ missionaryId: missionary.id })
      .bearerToken(token)

    index.assertStatus(200)
    const byId = Object.fromEntries(
      (index.body() as ApiBody).data.posts.map((post: any) => [post.id, post])
    )
    assert.containsSubset(byId[liked.id], { isLiked: true, likesCount: 1 })
    assert.containsSubset(byId[other.id], { isLiked: false, likesCount: 0 })

    const show = await client.get(url.show(liked.id)).bearerToken(token)
    assert.containsSubset((show.body() as ApiBody).data.post, { isLiked: true, likesCount: 1 })
  })
})
