import type Post from '#models/post'
import PostImageTransformer from '#transformers/post_image_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'content',
        'highlightLink',
        'slug',
        'missionaryId',
        'createdAt',
      ]),
      // NOTE: transformers aninhados nascem com maxDepth 1 — sem `depth(2)` o
      // `image` (MediaAsset) de cada PostImage seria omitido silenciosamente
      images: PostImageTransformer.transform(this.whenLoaded(this.resource.images))?.depth(2),
    }
  }
}
