import { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * Mixin para adicionar a coluna createdAt a modelos imutáveis após criação
 * (registros de auditoria, assets, associações sem ciclo de edição).
 * Normaliza automaticamente para UTC antes de persistir.
 */
export const WithCreatedAt = <T extends NormalizeConstructor<typeof BaseModel>>(superclass: T) => {
  class WithCreatedAtMixin extends superclass {
    // NOTE: PostgreSQL TIMESTAMP WITHOUT TIME ZONE armazena o valor literal —
    // sem conversão explícita para UTC, timestamps de fusos distintos geram
    // drift silencioso no banco.
    @column.dateTime({
      autoCreate: true,
      prepare: (value: DateTime) => value.toUTC().toSQL(),
      serialize: (value: DateTime) => value.toUTC().toJSON(),
    })
    declare createdAt: DateTime
  }

  return WithCreatedAtMixin
}
