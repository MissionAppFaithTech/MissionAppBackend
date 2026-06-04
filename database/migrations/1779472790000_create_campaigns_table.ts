import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaigns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('name').notNullable()
      table.boolean('is_active').notNullable().defaultTo(false)
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.timestamp('start_date', { precision: 3, useTz: true }).nullable()
      table.timestamp('suspended_at', { precision: 3, useTz: true }).nullable()
      table.timestamp('end_date', { precision: 3, useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
