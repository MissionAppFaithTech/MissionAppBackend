import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'redirects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('source_path', 512).notNullable()
      table.string('destination_path', 512).notNullable()
      table.integer('status_code').notNullable().defaultTo(301)

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
