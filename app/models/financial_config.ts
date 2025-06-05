import { FinancialConfigSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import MediaAsset from './media_asset.ts'
import Missionary from './missionary.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'

export default class FinancialConfig extends compose(
  FinancialConfigSchema,
  WithPrimaryUuid,
  WithTimestamps
) {
  @belongsTo(() => Missionary)
  declare missionary: BelongsTo<typeof Missionary>

  @belongsTo(() => MediaAsset, { foreignKey: 'qr_code_asset_id' })
  declare qrCodeAsset: BelongsTo<typeof MediaAsset>
}
