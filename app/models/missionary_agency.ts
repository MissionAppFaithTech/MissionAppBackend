import { MissionaryAgencySchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class MissionaryAgency extends compose(
  MissionaryAgencySchema,
  WithPrimaryUuid,
  WithCreatedAt
) {
  @belongsTo(() => User)
  declare registeredBy: BelongsTo<typeof User>
}
