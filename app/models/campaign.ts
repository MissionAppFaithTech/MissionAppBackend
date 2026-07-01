import { CampaignSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
// fallow-ignore-next-line circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import CampaignProject from './campaign_project.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class Campaign extends compose(CampaignSchema, WithPrimaryUuid, WithCreatedAt) {
  @hasMany(() => CampaignProject)
  declare projects: HasMany<typeof CampaignProject>
}
