import { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * Mixin to add createdAt and updatedAt timestamps with automatic UTC normalization
 */
export const WithTimestamps = <T extends NormalizeConstructor<typeof BaseModel>>(superclass: T) => {
  class WithTimestampsMixin extends superclass {
    // PostgreSQL TIMESTAMP WITHOUT TIME ZONE armazena o valor literal — sem conversão
    // explícita para UTC, timestamps de fusos distintos geram drift silencioso no banco.
    @column.dateTime({
      autoCreate: true,
      prepare: (value: DateTime) => value.toUTC().toSQL(),
      serialize: (value: DateTime) => value.toUTC().toJSON(),
    })
    declare createdAt: DateTime

    @column.dateTime({
      autoCreate: true,
      autoUpdate: true,
      prepare: (value: DateTime) => value.toUTC().toSQL(),
      serialize: (value: DateTime) => value.toUTC().toJSON(),
    })
    declare updatedAt: DateTime
  }

  return WithTimestampsMixin
}
