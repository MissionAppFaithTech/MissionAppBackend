import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { purgeAbandonedMediaAssets } from '#jobs/media_asset/purge_abandoned_media_assets_job'
import MediaAsset from '#models/media_asset'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createTestMediaAsset } from '#tests/functional/media_asset/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import drive from '@adonisjs/drive/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('purgeAbandonedMediaAssets', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  group.each.setup(() => {
    drive.fake('s3')
    return () => drive.restore('s3')
  })

  test('remove uploads pendentes ou rejeitados antigos e preserva os demais', async ({
    assert,
  }) => {
    const disk = drive.use()
    const { user } = await createTestUser()
    const twoDaysAgo = DateTime.now().minus({ days: 2 })

    const create = async (status: MediaAssetStatus, createdAt?: DateTime) => {
      const asset = await createTestMediaAsset(user, MediaAssetPurpose.POST_IMAGE, status)
      if (createdAt) {
        asset.createdAt = createdAt
        await asset.save()
      }
      await disk.put(asset.fileKey, new Uint8Array([1]))
      return asset
    }

    const oldPending = await create(MediaAssetStatus.PENDING_UPLOAD, twoDaysAgo)
    const oldFailed = await create(MediaAssetStatus.FAILED, twoDaysAgo)
    const recentPending = await create(MediaAssetStatus.PENDING_UPLOAD)
    const oldReady = await create(MediaAssetStatus.READY, twoDaysAgo)

    await purgeAbandonedMediaAssets()

    assert.isNull(await MediaAsset.find(oldPending.id))
    assert.isNull(await MediaAsset.find(oldFailed.id))
    assert.isFalse(await disk.exists(oldPending.fileKey))
    assert.isNotNull(await MediaAsset.find(recentPending.id))
    assert.isNotNull(await MediaAsset.find(oldReady.id))
    assert.isTrue(await disk.exists(oldReady.fileKey))
  })
})
