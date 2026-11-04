import { POST_IMAGES_PER_MISSIONARY_LIMIT } from '#constants/post'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { UserRole } from '#enums/user/user_role'
import Post from '#models/post'
import PostImage from '#models/post_image'
import { createTestUser } from '#tests/functional/auth/helpers'
import {
  createImageAssetIds,
  createTestMediaAsset,
  loginAs,
  queuedDiscardIds,
  seedPostImages,
} from '#tests/functional/media_asset/helpers'
import type { ApiBody } from '#tests/functional/media_asset/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const url = {
  index: () => router.builder().make('v1.posts.index')!,
  store: () => router.builder().make('v1.posts.store')!,
  show: (id: string) => router.builder().params({ id }).make('v1.posts.show')!,
  update: (id: string) => router.builder().params({ id }).make('v1.posts.update')!,
  destroy: (id: string) => router.builder().params({ id }).make('v1.posts.destroy')!,
}

async function missionaryImageIds(missionaryId: string): Promise<string[]> {
  const images = await PostImage.query()
    .join('posts', 'posts.id', 'post_images.post_id')
    .where('posts.missionary_id', missionaryId)
    .select('post_images.*')
  return images.map((image) => image.imageAssetId)
}

test.group('Posts - CRUD', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria, detalha, atualiza e remove postagem com imagens', async ({ client, assert }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const [first, second, third] = await createImageAssetIds(user, 3)

    const store = await client
      .post(url.store())
      .bearerToken(token)
      .json({ content: 'Notícias do campo missionário', imageAssetIds: [first, second] })

    store.assertStatus(200)
    const stored = (store.body() as ApiBody).data.post
    assert.equal(stored.missionaryId, missionary.id)
    assert.match(stored.slug, /^noticias-do-campo-missionario-[0-9a-f]{8}$/)
    assert.deepEqual(
      stored.images.map((image: any) => image.imageAssetId),
      [first, second]
    )
    assert.isString(stored.images[0].image.url)

    const show = await client.get(url.show(stored.id)).bearerToken(token)
    show.assertStatus(200)
    assert.equal((show.body() as ApiBody).data.post.content, 'Notícias do campo missionário')

    const update = await client
      .patch(url.update(stored.id))
      .bearerToken(token)
      .json({ content: 'Atualização', imageAssetIds: [third, first] })

    update.assertStatus(200)
    const updated = (update.body() as ApiBody).data.post
    assert.equal(updated.content, 'Atualização')
    assert.deepEqual(
      updated.images.map((image: any) => image.imageAssetId),
      [third, first]
    )
    // NOTE: a imagem retirada do post é descartada (arquivo e registro)
    assert.include(await queuedDiscardIds(), second)

    const destroy = await client.delete(url.destroy(stored.id)).bearerToken(token)

    destroy.assertStatus(200)
    assert.isNull(await Post.find(stored.id))
    assert.lengthOf(await PostImage.query().where('postId', stored.id), 0)
    assert.includeMembers(await queuedDiscardIds(), [third, first])
  })

  test('cria postagem só com legenda, sem imagens', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)

    const store = await client.post(url.store()).bearerToken(token).json({ content: 'Só texto' })

    store.assertStatus(200)
    assert.deepEqual((store.body() as ApiBody).data.post.images, [])
  })

  test('exige legenda e no máximo 3 imagens distintas (RF 8.1): {label}')
    .with([
      { label: 'sem legenda', body: { imageAssetIds: [] as string[] }, images: 1 },
      { label: 'legenda só com espaços', body: { content: '   ' }, images: 1 },
      { label: '4 imagens', images: 4 },
      { label: 'imagem repetida', images: 1, duplicate: true },
      { label: 'link inválido', body: { content: 'Post', highlightLink: 'não é url' }, images: 1 },
    ])
    .run(async ({ client, assert }, row) => {
      const { user, password } = await createMissionaryTestUser()
      const token = await loginAs(client, user, password)
      const ids = await createImageAssetIds(user, row.images)
      const body = row.body ?? {
        content: 'Post',
        imageAssetIds: row.duplicate ? [ids[0], ids[0]] : ids,
      }

      const response = await client.post(url.store()).bearerToken(token).json(body)

      response.assertStatus(422)
      response.assertBodyContains({ code: 'E_VALIDATION_ERROR' })
      assert.lengthOf(await Post.query().where('content', 'Post'), 0)
    })

  test('recusa imagem que não pode ser anexada: {label}')
    .with([
      { label: 'de outro usuário', otherOwner: true },
      { label: 'upload pendente', status: MediaAssetStatus.PENDING_UPLOAD },
      { label: 'com falha', status: MediaAssetStatus.FAILED },
      { label: 'capa de projeto', purpose: MediaAssetPurpose.IMPACT_PROJECT_COVER },
    ])
    .run(async ({ client }, row) => {
      const { user, password } = await createMissionaryTestUser()
      const { user: other } = await createTestUser()
      const token = await loginAs(client, user, password)
      const asset = await createTestMediaAsset(
        row.otherOwner ? other : user,
        row.purpose ?? MediaAssetPurpose.POST_IMAGE,
        row.status ?? MediaAssetStatus.READY
      )

      const response = await client
        .post(url.store())
        .bearerToken(token)
        .json({ content: 'Post', imageAssetIds: [asset.id] })

      response.assertStatus(422)
      response.assertBodyContains({ code: 'E_MEDIA_ASSET_NOT_ATTACHABLE' })
    })

  test('recusa imagem já vinculada a outra postagem', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const [image] = await createImageAssetIds(user, 1)

    for (const expectedStatus of [200, 422]) {
      const response = await client
        .post(url.store())
        .bearerToken(token)
        .json({ content: 'Post', imageAssetIds: [image] })

      response.assertStatus(expectedStatus)
    }
  })
})

test.group('Posts - limite de 50 imagens por missionário (RF 8.2)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('sem confirmação responde 409 e não grava nada', async ({ client, assert }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    await seedPostImages(user, missionary, POST_IMAGES_PER_MISSIONARY_LIMIT)
    const newImages = await createImageAssetIds(user, 2)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ content: 'Post novo', imageAssetIds: newImages })

    response.assertStatus(409)
    response.assertBodyContains({ code: 'E_POST_IMAGE_LIMIT_REACHED' })
    assert.match((response.body() as { message: string }).message, /substituir as 2 mais antigas/)
    assert.lengthOf(await Post.query().where('content', 'Post novo'), 0)
    assert.lengthOf(await missionaryImageIds(missionary.id), POST_IMAGES_PER_MISSIONARY_LIMIT)
  })

  test('com confirmação substitui as imagens mais antigas', async ({ client, assert }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const seeded = await seedPostImages(user, missionary, POST_IMAGES_PER_MISSIONARY_LIMIT)
    const newImages = await createImageAssetIds(user, 2)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ content: 'Post novo', imageAssetIds: newImages, replaceOldestImages: true })

    response.assertStatus(200)
    const remaining = await missionaryImageIds(missionary.id)
    assert.lengthOf(remaining, POST_IMAGES_PER_MISSIONARY_LIMIT)
    assert.includeMembers(remaining, newImages)
    // NOTE: saem as do post mais antigo; no mesmo lote, as últimas da galeria
    const evicted = seeded.filter((id) => !remaining.includes(id))
    assert.lengthOf(evicted, 2)
    assert.includeMembers(seeded.slice(0, 3), evicted)
    assert.includeMembers(await queuedDiscardIds(), evicted)
  })

  test('abaixo do limite não pede confirmação', async ({ client }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    await seedPostImages(user, missionary, POST_IMAGES_PER_MISSIONARY_LIMIT - 3)
    const newImages = await createImageAssetIds(user, 3)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ content: 'Cabe exatamente', imageAssetIds: newImages })

    response.assertStatus(200)
  })

  test('a edição que passa do limite também pede confirmação e não altera o post', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    await seedPostImages(user, missionary, POST_IMAGES_PER_MISSIONARY_LIMIT - 1)
    const store = await client.post(url.store()).bearerToken(token).json({ content: 'Original' })
    const postId = (store.body() as ApiBody).data.post.id as string
    const newImages = await createImageAssetIds(user, 2)

    const update = await client
      .patch(url.update(postId))
      .bearerToken(token)
      .json({ content: 'Editado', imageAssetIds: newImages })

    update.assertStatus(409)
    update.assertBodyContains({ code: 'E_POST_IMAGE_LIMIT_REACHED' })
    const unchanged = await Post.findOrFail(postId)
    assert.equal(unchanged.content, 'Original')

    const confirmed = await client
      .patch(url.update(postId))
      .bearerToken(token)
      .json({ content: 'Editado', imageAssetIds: newImages, replaceOldestImages: true })

    confirmed.assertStatus(200)
    assert.lengthOf(await missionaryImageIds(missionary.id), POST_IMAGES_PER_MISSIONARY_LIMIT)
  })
})

test.group('Posts - listagem por cursor (ADR-0033)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('pagina do mais recente ao mais antigo, filtrando por missionário', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const { user: otherUser, password: otherPassword } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const otherToken = await loginAs(client, otherUser, otherPassword)

    for (const content of ['Primeiro', 'Segundo', 'Terceiro']) {
      await client.post(url.store()).bearerToken(token).json({ content })
    }
    await client.post(url.store()).bearerToken(otherToken).json({ content: 'De outro' })

    const first = await client
      .get(url.index())
      .qs({ missionaryId: missionary.id, limit: 2 })
      .bearerToken(token)

    first.assertStatus(200)
    const firstBody = first.body() as ApiBody
    assert.deepEqual(
      firstBody.data.posts.map((post: any) => post.content),
      ['Terceiro', 'Segundo']
    )
    assert.isTrue(firstBody.meta!.hasMore)
    assert.isString(firstBody.meta!.nextCursor)

    const second = await client
      .get(url.index())
      .qs({ missionaryId: missionary.id, limit: 2, cursor: firstBody.meta!.nextCursor })
      .bearerToken(token)

    const secondBody = second.body() as ApiBody
    assert.deepEqual(
      secondBody.data.posts.map((post: any) => post.content),
      ['Primeiro']
    )
    assert.deepEqual(secondBody.meta, { nextCursor: null, hasMore: false })
  })

  test('recusa {label} inválido')
    .with([
      { label: 'cursor', qs: { cursor: 'nao-e-um-cursor' }, code: 'E_INVALID_CURSOR' },
      { label: 'limite', qs: { limit: 21 }, code: 'E_VALIDATION_ERROR' },
    ])
    .run(async ({ client }, row) => {
      const { user, password } = await createMissionaryTestUser()
      const token = await loginAs(client, user, password)

      const response = await client.get(url.index()).qs(row.qs).bearerToken(token)

      response.assertStatus(422)
      response.assertBodyContains({ code: row.code })
    })
})

test.group('Posts - permissões', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('outro missionário não edita nem remove a postagem', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()
    const ownerToken = await loginAs(client, user, password)
    const store = await client.post(url.store()).bearerToken(ownerToken).json({ content: 'Meu' })
    const postId = (store.body() as ApiBody).data.post.id as string

    const { user: other, password: otherPassword } = await createMissionaryTestUser()
    const otherToken = await loginAs(client, other, otherPassword)

    const update = await client
      .patch(url.update(postId))
      .bearerToken(otherToken)
      .json({ content: 'Invadido' })
    update.assertStatus(403)
    update.assertBodyContains({ code: 'E_POST_FORBIDDEN' })

    const destroy = await client.delete(url.destroy(postId)).bearerToken(otherToken)
    destroy.assertStatus(403)
    const untouched = await Post.findOrFail(postId)
    assert.equal(untouched.content, 'Meu')
  })

  test('apoiador não cria postagem', async ({ client }) => {
    const { user, password } = await createTestUser()
    const token = await loginAs(client, user, password)

    const response = await client
      .post(url.store())
      .bearerToken(token)
      .json({ content: 'Tentativa' })

    response.assertStatus(403)
    response.assertBodyContains({ code: 'E_MISSIONARY_PROFILE_FORBIDDEN' })
  })

  test('admin cria postagem para um missionário informado e edita a dele', async ({
    client,
    assert,
  }) => {
    const { missionary } = await createMissionaryTestUser()
    const { user: admin, password } = await createTestUser()
    admin.role = UserRole.ADMIN
    await admin.save()
    const token = await loginAs(client, admin, password)

    const withoutTarget = await client.post(url.store()).bearerToken(token).json({ content: 'X' })
    withoutTarget.assertStatus(403)

    const store = await client
      .post(url.store())
      .bearerToken(token)
      .json({ content: 'Pelo admin', missionaryId: missionary.id })
    store.assertStatus(200)
    const postId = (store.body() as ApiBody).data.post.id as string
    const created = await Post.findOrFail(postId)
    assert.equal(created.missionaryId, missionary.id)

    const update = await client
      .patch(url.update(postId))
      .bearerToken(token)
      .json({ content: 'Corrigido pelo admin' })
    update.assertStatus(200)
  })

  test('responde 404 para postagem inexistente', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()
    const token = await loginAs(client, user, password)
    const missingId = '01900000-0000-7000-8000-000000000000'

    const show = await client.get(url.show(missingId)).bearerToken(token)
    const update = await client
      .patch(url.update(missingId))
      .bearerToken(token)
      .json({ content: 'X' })
    const destroy = await client.delete(url.destroy(missingId)).bearerToken(token)

    for (const response of [show, update, destroy]) {
      response.assertStatus(404)
      response.assertBodyContains({ code: 'E_POST_NOT_FOUND' })
    }
  })

  test('exige login', async ({ client }) => {
    const response = await client.get(url.index())

    response.assertStatus(401)
  })
})
