import { v7 as randomUUID } from 'uuid'
import { beforeCreate, column } from '@adonisjs/lucid/orm'
import type { BaseModel } from '@adonisjs/lucid/orm'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

/**
 * A mixin for adding a UUID v7 primary key to a model and automatically generating it
 */
export const WithPrimaryUuid = <Model extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Model
) => {
  class WithPrimaryUuidClass extends superclass {
    static selfAssignPrimaryKey = true

    @column({ isPrimary: true })
    declare id: string

    @beforeCreate()
    static generateId(model: any) {
      model.id ??= randomUUID()
    }
  }

  return WithPrimaryUuidClass
}
