import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'likes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('user_id').notNullable()
      table.uuid('post_id').notNullable()

      table
        .foreign('user_id', 'fk_likes_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('post_id', 'fk_likes_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['user_id', 'post_id'], { indexName: 'uq_likes_user_id_post_id' })

      table.index(['user_id'], 'idx_likes_user_id')
      table.index(['post_id'], 'idx_likes_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
