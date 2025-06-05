import { RefreshTokenSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'

export default class RefreshToken extends compose(
  RefreshTokenSchema,
  WithPrimaryUuid,
  WithTimestamps
) {}
