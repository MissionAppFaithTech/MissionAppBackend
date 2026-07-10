import { MediaAssetSchema } from '#database/schema'
import type { Provider } from '#enums/media_asset/provider'
import { compose } from '@adonisjs/core/helpers'
import { Filterable } from '@dirupt/adonis-lucid-filter'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class MediaAsset extends compose(
  MediaAssetSchema,
  WithPrimaryUuid,
  WithCreatedAt,
  Filterable
) {
  declare provider: Provider
}
