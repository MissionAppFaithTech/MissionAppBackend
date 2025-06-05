import { FollowerSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class Follower extends compose(FollowerSchema, WithPrimaryUuid, WithCreatedAt) {
  @belongsTo(() => User, { foreignKey: 'follower_id' })
  declare follower: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'following_id' })
  declare following: BelongsTo<typeof User>
}
