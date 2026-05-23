import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionary_work_addresses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('zip').notNullable()
      table.string('district').notNullable()
      table.string('city').notNullable()
      table.string('state').notNullable()
      table.string('country').notNullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('missionary_id').notNullable()

      table
        .foreign('missionary_id', 'fk_missionary_work_addresses_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['missionary_id'], { indexName: 'uq_missionary_work_addresses_missionary_id' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
