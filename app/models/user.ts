import { UserSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { Filterable } from '@dirupt/adonis-lucid-filter'
// fallow-ignore-next-line circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import AuthenticationAudit from './authentication_audit.ts'
import UserFilter from './filters/user_filter.ts'
import MediaAsset from './media_asset.ts'
import { AuthFinder } from './mixins/auth_finder.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import { WithTimestamps } from './mixins/with_timestamps.ts'
// fallow-ignore-next-line circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import UserActionAudit from './user_action_audit.ts'

export default class User extends compose(
  UserSchema,
  WithPrimaryUuid,
  WithTimestamps,
  AuthFinder,
  Filterable
) {
  static $filter = () => UserFilter

  @belongsTo(() => MediaAsset, { foreignKey: 'profile_picture_id' })
  declare profilePicture: BelongsTo<typeof MediaAsset>

  @hasMany(() => AuthenticationAudit)
  declare authenticationAudits: HasMany<typeof AuthenticationAudit>

  @hasMany(() => UserActionAudit)
  declare userActionAudit: HasMany<typeof UserActionAudit>
}
