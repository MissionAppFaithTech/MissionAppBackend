// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { PostSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Comment from './comment.ts'
import Like from './like.ts'
import Missionary from './missionary.ts'
import PostImage from './post_image.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class Post extends compose(PostSchema, WithPrimaryUuid, WithCreatedAt) {
  @belongsTo(() => Missionary)
  declare missionary: BelongsTo<typeof Missionary>

  @hasMany(() => PostImage)
  declare images: HasMany<typeof PostImage>

  @hasMany(() => Like)
  declare likes: HasMany<typeof Like>

  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
