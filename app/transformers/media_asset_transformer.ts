import type MediaAsset from '#models/media_asset'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MediaAssetTransformer extends BaseTransformer<MediaAsset> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'provider',
        'bucket',
        'fileKey',
        'mimeType',
        'fileSizeBytes',
        'purpose',
        'status',
        'createdAt',
      ]),
      url: mediaAssetUrl(this.resource),
    }
  }
}
