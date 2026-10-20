import { POST_IMAGES_PER_MISSIONARY_LIMIT } from '#constants/post'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import Post from '#models/post'
import PostImage from '#models/post_image'
import type User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createTestMediaAsset } from '#tests/functional/media_asset/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type ApiBody = { data: Record<string, any> }

async function loginAndGetAccessToken(login: string, password: string, client: any) {
  const response = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login, password })

  return (response.body() as TokensBody).data.accessToken as string
}

async function createImageAssetIds(owner: User, count: number): Promise<string[]> {
  const ids: string[] = []
  for (let index = 0; index < count; index++) {
    const asset = await createTestMediaAsset(owner, MediaAssetPurpose.POST_IMAGE)
    ids.push(asset.id)
  }
  return ids
}

test.group('Posts - CRUD', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria, lista, detalha, atualiza e remove postagem com imagens', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const [first, second, third] = await createImageAssetIds(user, 3)

    const store = await client
      .post(router.builder().make('v1.posts.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ content: 'Notícias do campo missionário', imageAssetIds: [first, second] })

    store.assertStatus(200)
    const stored = (store.body() as ApiBody).data.post
    assert.equal(stored.missionaryId, missionary.id)
    assert.match(stored.slug, /^noticias-do-campo-missionario-[0-9a-f]{8}$/)
    assert.deepEqual(
      stored.images.map((image: any) => image.imageAssetId),
      [first, second]
    )

    const index = await client
      .get(router.builder().make('v1.posts.index')!)
      .qs({ missionaryId: missionary.id })
      .header('Authorization', `Bearer ${accessToken}`)

    index.assertStatus(200)
    assert.lengthOf((index.body() as any).data, 1)

    const update = await client
      .patch(router.builder().params({ id: stored.id }).make('v1.posts.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ content: 'Atualização', imageAssetIds: [third, first] })

    update.assertStatus(200)
    const updated = (update.body() as ApiBody).data.post
    assert.equal(updated.content, 'Atualização')
    assert.equal(updated.slug, stored.slug)
    assert.deepEqual(
      updated.images.map((image: any) => [image.imageAssetId, image.order]),
      [
        [third, 0],
        [first, 1],
      ]
    )

    const show = await client
      .get(router.builder().params({ id: stored.id }).make('v1.posts.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    show.assertStatus(200)

    const destroy = await client
      .delete(router.builder().params({ id: stored.id }).make('v1.posts.destroy')!)
      .header('Authorization', `Bearer ${accessToken}`)

    destroy.assertStatus(200)
    assert.isNull(await Post.find(stored.id))
  })

  test('mantém só as imagens mais recentes ao ultrapassar o limite por missionário', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const oldestBatch = await createImageAssetIds(user, POST_IMAGES_PER_MISSIONARY_LIMIT)
    const oldPost = await client
      .post(router.builder().make('v1.posts.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ content: 'Post antigo', imageAssetIds: oldestBatch })

    oldPost.assertStatus(200)
    const oldPostId = (oldPost.body() as ApiBody).data.post.id as string

    const newestBatch = await createImageAssetIds(user, 2)
    const newPost = await client
      .post(router.builder().make('v1.posts.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ content: 'Post novo', imageAssetIds: newestBatch })

    newPost.assertStatus(200)

    const remaining = await PostImage.query()
      .join('posts', 'posts.id', 'post_images.post_id')
      .where('posts.missionary_id', missionary.id)
      .select('post_images.*')

    assert.lengthOf(remaining, POST_IMAGES_PER_MISSIONARY_LIMIT)

    const oldPostImages = remaining.filter((image) => image.postId === oldPostId)
    assert.lengthOf(oldPostImages, POST_IMAGES_PER_MISSIONARY_LIMIT - 2)

    // NOTE: as imagens desvinculadas são as do fim da galeria do post mais antigo
    const evicted = oldestBatch.slice(-2)
    assert.notIncludeMembers(
      remaining.map((image) => image.imageAssetId),
      evicted
    )
    assert.isNotNull(await Post.find(oldPostId))
  })

  test('rejeita imagem já vinculada a outra postagem', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const [image] = await createImageAssetIds(user, 1)

    for (const expectedStatus of [200, 422]) {
      const response = await client
        .post(router.builder().make('v1.posts.store')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ content: 'Post', imageAssetIds: [image] })

      response.assertStatus(expectedStatus)
    }
  })

  test('retorna 403 quando outro missionário tenta remover a postagem', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const ownerToken = await loginAndGetAccessToken(user.email, password, client)

    const store = await client
      .post(router.builder().make('v1.posts.store')!)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ content: 'Post protegido' })

    const postId = (store.body() as ApiBody).data.post.id as string

    const { user: other, password: otherPassword } = await createMissionaryTestUser()
    const otherToken = await loginAndGetAccessToken(other.email, otherPassword, client)

    const destroy = await client
      .delete(router.builder().params({ id: postId }).make('v1.posts.destroy')!)
      .header('Authorization', `Bearer ${otherToken}`)

    destroy.assertStatus(403)
  })

  test('retorna 403 quando apoiador tenta criar postagem', async ({ client }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const response = await client
      .post(router.builder().make('v1.posts.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ content: 'Tentativa' })

    response.assertStatus(403)
  })
})
