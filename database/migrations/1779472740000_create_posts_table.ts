import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.text('content').notNullable()
      table.string('highlight_link').nullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('missionary_id').notNullable()

      table
        .foreign('missionary_id', 'fk_posts_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['missionary_id', 'created_at'], 'idx_posts_missionary_id_created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
