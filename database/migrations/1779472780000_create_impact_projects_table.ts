import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'impact_projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('title').notNullable()
      table.text('description').notNullable()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('updated_at', { precision: 3, useTz: true }).nullable()

      table.uuid('missionary_id').notNullable()

      table.uuid('cover_image_asset_id').notNullable()

      table.uuid('video_asset_id').nullable()

      table
        .foreign('missionary_id', 'fk_impact_projects_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('cover_image_asset_id', 'fk_impact_projects_cover')
        .references('id')
        .inTable('media_assets')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      table
        .foreign('video_asset_id', 'fk_impact_projects_video')
        .references('id')
        .inTable('media_assets')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.index(['missionary_id'], 'idx_impact_projects_missionary_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
