// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { FaithCommunitySchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Pastor from './pastor.ts'
import User from './user.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class FaithCommunity extends compose(
  FaithCommunitySchema,
  WithPrimaryUuid,
  WithCreatedAt
) {
  @belongsTo(() => User)
  declare registeredBy: BelongsTo<typeof User>

  @hasMany(() => Pastor)
  declare pastors: HasMany<typeof Pastor>
}
