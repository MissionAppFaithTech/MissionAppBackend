import type User from '#models/user'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { BaseModelFilter } from '@dirupt/adonis-lucid-filter'

export default class UserFilter extends BaseModelFilter {
  declare $query: ModelQueryBuilderContract<typeof User>

  name(value: string): void {
    this.$query.where('name', value)
  }
}
