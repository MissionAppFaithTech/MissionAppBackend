import { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * Mixin para adicionar createdAt e updatedAt a modelos mutáveis.
 * Normaliza automaticamente para UTC antes de persistir.
 */
// fallow-ignore-file code-duplication -- createdAt block mirrors with_created_at.ts by design; both encode the same UTC rule independently to avoid mixin composition typing issues
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
