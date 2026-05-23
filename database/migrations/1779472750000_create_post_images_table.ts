import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'post_images'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('image_asset_id').notNullable()
      table.integer('order').notNullable().defaultTo(0)
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('post_id').notNullable()

      table
        .foreign('post_id', 'fk_post_images_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('image_asset_id', 'fk_post_images_image_asset_id')
        .references('id')
        .inTable('media_assets')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      table.unique(['post_id', 'order'], {
        indexName: 'uq_post_images_post_id_order',
        deferrable: 'deferred',
      })

      table.check('?? >= 0', ['order'], 'chk_post_images_order_non_negative')

      table.index(['post_id'], 'idx_post_images_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
