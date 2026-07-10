// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { MissionarySchema } from '#database/schema'
import { IdentityType } from '#enums/missionary/identity_type'
import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import FinancialConfig from './financial_config.ts'
import ImpactProject from './impact_project.ts'
import MissionaryAgency from './missionary_agency.ts'
import MissionaryWorkAddress from './missionary_work_address.ts'
import Post from './post.ts'
import User from './user.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class Missionary extends compose(MissionarySchema, WithPrimaryUuid, WithCreatedAt) {
  declare status: MissionaryStatus
  declare identityType: IdentityType | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => MissionaryAgency)
  declare agency: BelongsTo<typeof MissionaryAgency>

  @hasOne(() => ImpactProject)
  declare impactProject: HasOne<typeof ImpactProject>

  @hasOne(() => FinancialConfig)
  declare financialConfig: HasOne<typeof FinancialConfig>

  @hasOne(() => MissionaryWorkAddress)
  declare workAddresses: HasOne<typeof MissionaryWorkAddress>

  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}
