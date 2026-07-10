// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { FinancialConfigSchema } from '#database/schema'
import { BankAccountType } from '#enums/financial_config/bank_account_type'
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
  declare accountType: BankAccountType | null

  @belongsTo(() => Missionary)
  declare missionary: BelongsTo<typeof Missionary>

  @belongsTo(() => MediaAsset, { foreignKey: 'qr_code_asset_id' })
  declare qrCodeAsset: BelongsTo<typeof MediaAsset>
}
