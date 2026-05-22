import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'impact_projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('title').notNullable()
      table.text('description').notNullable()
      table.string('video_url').nullable()
      table.string('cover_image').notNullable()

      table.uuid('missionary_id').notNullable()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('updated_at', { precision: 3, useTz: true }).nullable()

      table
        .foreign('missionary_id', 'fk_impact_projects_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['missionary_id'], 'idx_impact_projects_missionary_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
