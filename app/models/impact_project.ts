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

  @belongsTo(() => MediaAsset, { foreignKey: 'cover_image_asset_id' })
  declare coverImage: BelongsTo<typeof MediaAsset>

  @belongsTo(() => MediaAsset, { foreignKey: 'video_asset_id' })
  declare video: BelongsTo<typeof MediaAsset>

  @hasMany(() => CampaignProject, { foreignKey: 'project_id' })
  declare campaignProjects: HasMany<typeof CampaignProject>
}
