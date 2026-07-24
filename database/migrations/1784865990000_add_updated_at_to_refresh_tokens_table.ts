import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .timestamp('updated_at', { precision: 3, useTz: true })
        .notNullable()
        .defaultTo(this.now())
        .comment('Última atualização do registro; mantido pelo WithTimestamps')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('updated_at')
    })
  }
}