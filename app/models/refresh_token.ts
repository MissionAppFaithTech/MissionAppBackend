import { RefreshTokenSchema } from '#database/schema'
import type { DeviceType } from '#enums/refresh_token/device_type'
import { compose } from '@adonisjs/core/helpers'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'

export default class RefreshToken extends compose(
  RefreshTokenSchema,
  WithPrimaryUuid,
  WithTimestamps
) {
  declare deviceType: DeviceType
}
