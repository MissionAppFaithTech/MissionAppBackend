import { MEDIA_ASSET_RULES } from '#constants/media_asset'
import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import MediaAsset from '#models/media_asset'
import Post from '#models/post'
import PostImage from '#models/post_image'
import { MediaProcessingService } from '#services/media_asset/media_processing_service'
import { createTestMediaAsset } from '#tests/functional/media_asset/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import { test } from '@japa/runner'
import sharp from 'sharp'

async function createProcessingAsset(fileKey: string, purpose = MediaAssetPurpose.POST_IMAGE) {
  const { user } = await createMissionaryTestUser()
  const asset = await createTestMediaAsset(user, purpose, MediaAssetStatus.PROCESSING)
  asset.merge({ fileKey, mimeType: 'image/jpeg' })
  await asset.save()
  return asset
}

test.group('MediaProcessingService', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('redimensiona, converte para webp e substitui o original', async ({ assert }) => {
    const disk = drive.use()
    const original = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: '#3366cc' },
    })
      .jpeg({ quality: 100 })
      .toBuffer()

    const asset = await createProcessingAsset('posts/images/test/photo.jpg')
    await disk.put(asset.fileKey, original)

    await new MediaProcessingService().process(asset.id)
    await asset.refresh()

    assert.equal(asset.status, MediaAssetStatus.READY)
    assert.equal(asset.mimeType, 'image/webp')
    assert.equal(asset.fileKey, 'posts/images/test/photo.webp')
    assert.isBelow(asset.fileSizeBytes, original.byteLength)
    assert.isFalse(await disk.exists('posts/images/test/photo.jpg'))

    const metadata = await sharp(await disk.getBytes(asset.fileKey)).metadata()
    const maxDimension = MEDIA_ASSET_RULES[MediaAssetPurpose.POST_IMAGE].maxDimensionPx!
    assert.equal(metadata.format, 'webp')
    assert.equal(metadata.width, maxDimension)
    assert.isAtMost(metadata.height!, maxDimension)
  })

  test('marca como FAILED e remove o objeto quando o conteúdo não é imagem', async ({ assert }) => {
    const disk = drive.use()
    const asset = await createProcessingAsset('posts/images/test/fake.jpg')
    await disk.put(asset.fileKey, new TextEncoder().encode('<?php echo "não sou imagem"; ?>'))

    await new MediaProcessingService().process(asset.id)
    await asset.refresh()

    assert.equal(asset.status, MediaAssetStatus.FAILED)
    assert.isFalse(await disk.exists('posts/images/test/fake.jpg'))
  })

  test('marca como FAILED quando o objeto não existe no storage', async ({ assert }) => {
    const asset = await createProcessingAsset('posts/images/test/missing.jpg')

    await new MediaProcessingService().process(asset.id)
    await asset.refresh()

    assert.equal(asset.status, MediaAssetStatus.FAILED)
  })

  test('remove registro e objeto descartados, preservando assets ainda referenciados', async ({
    assert,
  }) => {
    const disk = drive.use()
    const { user, missionary } = await createMissionaryTestUser()
    const discarded = await createTestMediaAsset(user)
    const stillUsed = await createTestMediaAsset(user)

    await disk.put(discarded.fileKey, new Uint8Array([1]))
    await disk.put(stillUsed.fileKey, new Uint8Array([1]))

    const post = await Post.create({ missionaryId: missionary.id, content: 'x', slug: 'x-1' })
    await PostImage.create({ postId: post.id, imageAssetId: stillUsed.id, order: 0 })

    await new MediaProcessingService().deleteMany([discarded.id, stillUsed.id])

    assert.isNull(await MediaAsset.find(discarded.id))
    assert.isFalse(await disk.exists(discarded.fileKey))
    assert.isNotNull(await MediaAsset.find(stillUsed.id))
    assert.isTrue(await disk.exists(stillUsed.fileKey))
  })
})
