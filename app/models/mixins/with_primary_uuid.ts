import { v7 as randomUUID } from 'uuid'
import { beforeCreate, column } from '@adonisjs/lucid/orm'
import type { BaseModel } from '@adonisjs/lucid/orm'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

/**
 * Mixin para adicionar chave primária UUID v7 e gerá-la automaticamente no beforeCreate.
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
