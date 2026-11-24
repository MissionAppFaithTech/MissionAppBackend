import type Post from '#models/post'
import PostImageTransformer from '#transformers/post_image_transformer'
import { mediaAssetUrl } from '#utils/media_asset_url'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PostTransformer extends BaseTransformer<Post> {
  toObject() {
    const user = this.resource.missionary?.user

    return {
      ...this.pick(this.resource, [
        'id',
        'content',
        'highlightLink',
        'slug',
        'missionaryId',
        'createdAt',
      ]),
      // NOTE: só no feed, que carrega missionary.user; fora dele a chave some
      author: user
        ? {
            username: user.username,
            fullName: user.fullName,
            profilePictureUrl: user.profilePicture ? mediaAssetUrl(user.profilePicture) : null,
          }
        : undefined,
      // NOTE: transformers aninhados nascem com maxDepth 1 — sem `depth(2)` o
      // `image` (MediaAsset) de cada PostImage seria omitido silenciosamente
      images: PostImageTransformer.transform(this.whenLoaded(this.resource.images))?.depth(2),
    }
  }
}
