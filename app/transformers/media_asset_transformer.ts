import type MediaAsset from '#models/media_asset'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MediaAssetTransformer extends BaseTransformer<MediaAsset> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'provider',
      'bucket',
      'fileKey',
      'mimeType',
      'fileSizeBytes',
      'createdAt',
    ])
  }
}
