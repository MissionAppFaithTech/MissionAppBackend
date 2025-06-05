import { CommentSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Post from './post.ts'
import User from './user.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'

export default class Comment extends compose(CommentSchema, WithPrimaryUuid, WithTimestamps) {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Post)
  declare post: BelongsTo<typeof Post>
}
