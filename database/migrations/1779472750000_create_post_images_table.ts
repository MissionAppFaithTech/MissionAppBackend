import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'post_images'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('image_url').notNullable()
      table.integer('order').notNullable().defaultTo(0)
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('post_id').notNullable()

      table
        .foreign('post_id', 'fk_post_images_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['post_id'], 'idx_post_images_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
