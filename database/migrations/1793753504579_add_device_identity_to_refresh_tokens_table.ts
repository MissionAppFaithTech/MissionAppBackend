import { DEVICE_ID_HASH_LENGTH, DEVICE_KIND_MAX_LENGTH } from '#constants/refresh_token'
import { DeviceKind } from '#enums/refresh_token/device_kind'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Uma sessão por aparelho (ADR-0038): identifica o aparelho de cada família de
 * refresh token, para que um novo login do mesmo aparelho substitua a sessão
 * anterior em vez de acumular outra, e mostra se a sessão é de computador,
 * celular ou tablet.
 */
export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('device_id', DEVICE_ID_HASH_LENGTH)
        .nullable()
        .comment(
          'SHA-256 (hex) do identificador aleatório do aparelho enviado em x-device-id; nunca o valor bruto. Nulo para clientes que não o enviam'
        )
      table
        .string('device_kind', DEVICE_KIND_MAX_LENGTH)
        .notNullable()
        .defaultTo(DeviceKind.UNKNOWN)
        .comment(
          "Tipo de aparelho da sessão ('desktop', 'mobile', 'tablet' ou 'unknown'), informado em x-device-kind; usado só para exibição"
        )

      // NOTE: DDL não aceita parâmetros ($1...); os valores são as constantes do enum.
      const kinds = Object.values(DeviceKind)
        .map((kind) => `'${kind}'`)
        .join(', ')
      table.check(`device_kind in (${kinds})`, [], 'chk_refresh_tokens_device_kind')
    })

    // NOTE: o login procura as sessões ativas do mesmo aparelho para substituí-las.
    this.schema.raw(
      'CREATE INDEX idx_refresh_tokens_user_id_device_id_active ON refresh_tokens (user_id, device_id) WHERE revoked_at IS NULL AND device_id IS NOT NULL'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS idx_refresh_tokens_user_id_device_id_active')
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['chk_refresh_tokens_device_kind'])
      table.dropColumns('device_id', 'device_kind')
    })
  }
}
