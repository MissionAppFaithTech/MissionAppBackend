import {
  DEVICE_NAME_MAX_LENGTH,
  DEVICE_TYPE_MAX_LENGTH,
  IP_ADDRESS_MAX_LENGTH,
} from '#constants/refresh_token'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('device_type', DEVICE_TYPE_MAX_LENGTH)
        .notNullable()
        .defaultTo('web')
        .comment(
          "Tipo de cliente que originou a sessão ('web' ou 'mobile'); determina a política de TTL (sliding window) do refresh token e é exibido na listagem de sessões ativas"
        )
      table
        .string('device_name', DEVICE_NAME_MAX_LENGTH)
        .nullable()
        .comment(
          "Nome legível do dispositivo/cliente, informado pelo header x-device-name (ex: 'iPhone 15', 'Chrome no macOS'); usado apenas para exibição na listagem de sessões"
        )
      table
        .string('ip_address', IP_ADDRESS_MAX_LENGTH)
        .nullable()
        .comment(
          'IP de origem da requisição que criou ou rotacionou este token; formato IPv4 ou IPv6'
        )
      table
        .timestamp('last_used_at', { precision: 3, useTz: true })
        .nullable()
        .comment(
          'Data da última rotação bem-sucedida deste token; usado para ordenar a listagem de sessões por atividade recente'
        )

      table.check("device_type in ('web', 'mobile')", [], 'chk_refresh_tokens_device_type')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['chk_refresh_tokens_device_type'])
      table.dropColumns('device_type', 'device_name', 'ip_address', 'last_used_at')
    })
  }
}
