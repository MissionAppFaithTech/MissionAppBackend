import { UserActionAuditSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import User from './user.ts'
import { compose } from '@adonisjs/core/helpers'
import { Filterable } from '@dirupt/adonis-lucid-filter'

export default class UserActionAudit extends compose(
  UserActionAuditSchema,
  WithPrimaryUuid,
  WithCreatedAt,
  Filterable
) {
  @belongsTo(() => User, { foreignKey: 'actor_id' })
  declare actor: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'target_id' })
  declare target: BelongsTo<typeof User>
}
