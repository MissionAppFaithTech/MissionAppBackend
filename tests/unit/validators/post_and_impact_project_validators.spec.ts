import { MEDIA_ASSET_RULES } from '#constants/media_asset'
import { POST_IMAGES_PER_POST_LIMIT } from '#constants/post'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { createImpactProjectValidator } from '#validators/impact_project/create_impact_project'
import { listImpactProjectsValidator } from '#validators/impact_project/list_impact_projects'
import { updateImpactProjectValidator } from '#validators/impact_project/update_impact_project'
import { createPostValidator } from '#validators/post/create_post'
import { listPostsValidator } from '#validators/post/list_posts'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

const ids = (count: number) => Array.from({ length: count }, () => uuidv7())

test.group('Validators - postagem (RF 8.1)', () => {
  test('aceita legenda com até 3 imagens e a confirmação de substituição', async ({ assert }) => {
    const imageAssetIds = ids(POST_IMAGES_PER_POST_LIMIT)
    const output = await createPostValidator.validate({
      content: '  Notícias  ',
      imageAssetIds,
      replaceOldestImages: true,
    })

    assert.equal(output.content, 'Notícias')
    assert.deepEqual(output.imageAssetIds, imageAssetIds)
    assert.isTrue(output.replaceOldestImages)
  })

  test('recusa {label}')
    .with([
      { label: 'mais de 3 imagens', body: { content: 'Post', imageAssetIds: ids(4) } },
      { label: 'legenda vazia', body: { content: '' } },
      { label: 'legenda acima de 5000', body: { content: 'x'.repeat(5001) } },
      { label: 'confirmação não booleana', body: { content: 'P', replaceOldestImages: 'talvez' } },
    ])
    .run(async ({ assert }, { body }) => {
      await assert.rejects(() => createPostValidator.validate(body))
    })

  test('a listagem limita a página a 20 itens (NF 2.3)', async ({ assert }) => {
    await assert.rejects(() => listPostsValidator.validate({ limit: 21 }))
    const output = await listPostsValidator.validate({ limit: 20 })
    assert.equal(output.limit, 20)
  })
})

test.group('Validators - projeto de impacto (RF 9.2)', () => {
  test('converte o link do vídeo para embed na criação', async ({ assert }) => {
    const output = await createImpactProjectValidator.validate({
      title: 'Escola',
      description: 'Descrição',
      coverImageAssetId: uuidv7(),
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    })

    assert.equal(output.videoUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  test('na edição, null remove o vídeo e o link é convertido', async ({ assert }) => {
    const id = uuidv7()
    const removed = await updateImpactProjectValidator.validate({ params: { id }, videoUrl: null })
    assert.isNull(removed.videoUrl)

    const changed = await updateImpactProjectValidator.validate({
      params: { id },
      videoUrl: 'https://vimeo.com/76979871',
    })
    assert.equal(changed.videoUrl, 'https://player.vimeo.com/video/76979871')
  })

  test('recusa vídeo que não é do YouTube nem do Vimeo', async ({ assert }) => {
    await assert.rejects(
      () =>
        createImpactProjectValidator.validate({
          title: 'Escola',
          description: 'Descrição',
          coverImageAssetId: uuidv7(),
          videoUrl: 'https://www.tiktok.com/@a/video/1',
        }),
      /videoUrl|Validation/
    )
  })

  test('exige a capa e não aceita mais videoAssetId', async ({ assert }) => {
    await assert.rejects(() =>
      createImpactProjectValidator.validate({ title: 'Escola', description: 'D' })
    )
    const output = await createImpactProjectValidator.validate({
      title: 'Escola',
      description: 'D',
      coverImageAssetId: uuidv7(),
      videoAssetId: uuidv7(),
    })
    assert.notProperty(output, 'videoAssetId')
  })

  test('a listagem aceita busca, missionário e cursor', async ({ assert }) => {
    const missionaryId = uuidv7()
    const output = await listImpactProjectsValidator.validate({ search: 'escola', missionaryId })
    assert.deepEqual(output, { search: 'escola', missionaryId })
  })
})

test.group('Regras de upload de mídia', () => {
  test('só imagens, todas comprimidas pelo worker (vídeo é link, RF 9.2)', ({ assert }) => {
    assert.sameMembers(Object.keys(MEDIA_ASSET_RULES), [
      MediaAssetPurpose.IMPACT_PROJECT_COVER,
      MediaAssetPurpose.POST_IMAGE,
      MediaAssetPurpose.PROFILE_PICTURE,
    ])
    for (const rules of Object.values(MEDIA_ASSET_RULES)) {
      assert.isTrue(rules.mimeTypes.every((mimeType) => mimeType.startsWith('image/')))
      assert.isAbove(rules.maxDimensionPx, 0)
      assert.isAtMost(rules.maxSizeBytes, 10 * 1024 * 1024)
    }
    assert.equal(MEDIA_ASSET_RULES[MediaAssetPurpose.PROFILE_PICTURE].maxSizeBytes, 5 * 1024 * 1024)
  })
})
