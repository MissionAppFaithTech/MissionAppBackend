import type PostImage from '#models/post_image'
import MediaAssetTransformer from '#transformers/media_asset_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostImageTransformer extends BaseTransformer<PostImage> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'order', 'imageAssetId', 'createdAt']),
      image: MediaAssetTransformer.transform(this.whenLoaded(this.resource.image)),
    }
  }
}
