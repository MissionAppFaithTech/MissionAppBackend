import { RedirectSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { WithCreatedAt } from './mixins/with_created_at.ts'
import { WithPrimaryUuid } from './mixins/with_primary_uuid.ts'

export default class Redirect extends compose(RedirectSchema, WithPrimaryUuid, WithCreatedAt) {}
