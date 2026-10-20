// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { ImpactProjectSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import CampaignProject from './campaign_project.ts'
import MediaAsset from './media_asset.ts'
import Missionary from './missionary.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'

export default class ImpactProject extends compose(
  ImpactProjectSchema,
  WithPrimaryUuid,
  WithTimestamps
) {
  @belongsTo(() => Missionary)
  declare missionary: BelongsTo<typeof Missionary>

  @belongsTo(() => MediaAsset, { foreignKey: 'coverImageAssetId' })
  declare coverImage: BelongsTo<typeof MediaAsset>

  @belongsTo(() => MediaAsset, { foreignKey: 'videoAssetId' })
  declare video: BelongsTo<typeof MediaAsset>

  @hasMany(() => CampaignProject, { foreignKey: 'projectId' })
  declare campaignProjects: HasMany<typeof CampaignProject>
}
