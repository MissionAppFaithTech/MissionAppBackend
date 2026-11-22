import type Post from '#models/post'
import { withPendingDelta } from '#services/shared/counter/counter_buffer_service'
import PostImageTransformer from '#transformers/post_image_transformer'
import type { PostEngagement } from '#types/services/post/post_engagement'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  constructor(
    resource: Post,
    private engagement?: PostEngagement
  ) {
    super(resource)
  }

  toObject() {
    const post = this.resource

    return {
      ...this.pick(post, ['id', 'content', 'highlightLink', 'slug', 'missionaryId', 'createdAt']),
      // NOTE: transformers aninhados nascem com maxDepth 1 — sem `depth(2)` o
      // `image` (MediaAsset) de cada PostImage seria omitido silenciosamente
      images: PostImageTransformer.transform(this.whenLoaded(post.images))?.depth(2),
      likesCount: this.engagement
        ? withPendingDelta(post.likesCount, this.engagement.likesOverlay, post.id)
        : post.likesCount,
      isLiked: this.engagement?.likedPostIds.has(post.id) ?? false,
    }
  }
}
