import { MediaAssetSchema } from '#database/schema'
import type { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import type { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import type { Provider } from '#enums/media_asset/provider'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { Filterable } from '@dirupt/adonis-lucid-filter'
import User from './user.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class MediaAsset extends compose(
  MediaAssetSchema,
  WithPrimaryUuid,
  WithCreatedAt,
  Filterable
) {
  declare provider: Provider
  declare purpose: MediaAssetPurpose | null
  declare status: MediaAssetStatus

  @belongsTo(() => User, { foreignKey: 'uploadedByUserId' })
  declare uploadedBy: BelongsTo<typeof User>
}
