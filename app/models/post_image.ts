import { PostImageSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import MediaAsset from './media_asset.ts'
import Post from './post.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class PostImage extends compose(PostImageSchema, WithPrimaryUuid, WithCreatedAt) {
  @belongsTo(() => Post)
  declare post: BelongsTo<typeof Post>

  @belongsTo(() => MediaAsset, { foreignKey: 'image_asset_id' })
  declare image: BelongsTo<typeof MediaAsset>
}
