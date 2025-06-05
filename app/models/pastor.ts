import { PastorSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import FaithCommunity from './faith_community.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class Pastor extends compose(PastorSchema, WithPrimaryUuid, WithCreatedAt) {
  @belongsTo(() => FaithCommunity)
  declare faithCommunity: BelongsTo<typeof FaithCommunity>
}
