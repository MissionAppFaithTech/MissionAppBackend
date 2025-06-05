// fallow-ignore-file circular-dependency -- relacionamento Lucid com lazy loading via callback; ciclo inexistente em runtime
import { AuthenticationAuditSchema } from '#database/schema'
import { AuthenticationStatus } from '#enums/authentication_audit/authentication_status'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'
import User from './user.ts'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { Filterable } from '@dirupt/adonis-lucid-filter'

export default class AuthenticationAudit extends compose(
  AuthenticationAuditSchema,
  WithPrimaryUuid,
  WithCreatedAt,
  Filterable
) {
  declare status: AuthenticationStatus

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
