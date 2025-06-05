import { MissionaryWorkAddressSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Missionary from './missionary.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class MissionaryWorkAddress extends compose(
  MissionaryWorkAddressSchema,
  WithPrimaryUuid,
  WithCreatedAt
) {
  @belongsTo(() => Missionary)
  declare missionary: BelongsTo<typeof Missionary>
}
