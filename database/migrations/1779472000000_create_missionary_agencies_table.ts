import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionary_agencies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable()
      table.string('phone_number').nullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('missionary_id').nullable()

      table.index(['name'], 'idx_missionary_agencies_name')
      table.index(['missionary_id'], 'idx_missionary_agencies_missionary_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
