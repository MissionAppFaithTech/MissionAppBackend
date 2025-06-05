import { CampaignProjectSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Campaign from './campaign.ts'
import ImpactProject from './impact_project.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class CampaignProject extends compose(
  CampaignProjectSchema,
  WithPrimaryUuid,
  WithCreatedAt
) {
  @belongsTo(() => Campaign)
  declare campaign: BelongsTo<typeof Campaign>

  @belongsTo(() => ImpactProject, { foreignKey: 'project_id' })
  declare project: BelongsTo<typeof ImpactProject>
}
