import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'addresses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('zip').notNullable()
      table.string('district').notNullable()
      table.string('city').notNullable()
      table.string('state').notNullable()
      table.string('country').notNullable()

      table.uuid('missionary_id').nullable()

      table
        .foreign('missionary_id', 'fk_addresses_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['missionary_id'], { indexName: 'uq_addresses_missionary_id' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
