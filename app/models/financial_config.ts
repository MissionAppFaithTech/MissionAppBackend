// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { FinancialConfigSchema } from '#database/schema'
import { BankAccountType } from '#enums/financial_config/bank_account_type'
import { PixKeyType } from '#enums/financial_config/pix_key_type'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Missionary from './missionary.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'

/**
 * Configuração de recebimento do missionário. `pixKey`, `agency`,
 * `accountNumber`, `holderName` e `holderDocument` ficam cifrados no banco —
 * leia e grave só pelo `FinancialDataCipher`, nunca direto.
 */
export default class FinancialConfig extends compose(
  FinancialConfigSchema,
  WithPrimaryUuid,
  WithTimestamps
) {
  declare accountType: BankAccountType | null
  declare pixKeyType: PixKeyType | null

  @belongsTo(() => Missionary)
  declare missionary: BelongsTo<typeof Missionary>
}
