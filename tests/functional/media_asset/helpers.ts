import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { Provider } from '#enums/media_asset/provider'
import MediaAsset from '#models/media_asset'
import type User from '#models/user'
import { v7 as uuidv7 } from 'uuid'

export async function createTestMediaAsset(
  owner: User,
  purpose: MediaAssetPurpose = MediaAssetPurpose.POST_IMAGE,
  status: MediaAssetStatus = MediaAssetStatus.READY
) {
  return MediaAsset.create({
    provider: Provider.S3,
    bucket: 'missionapp-test-public-assets',
    fileKey: `tests/${owner.id}/${uuidv7()}.webp`,
    mimeType: 'image/webp',
    fileSizeBytes: 1024,
    purpose,
    status,
    uploadedByUserId: owner.id,
  })
}
