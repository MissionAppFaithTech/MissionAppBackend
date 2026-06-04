import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.text('content').notNullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('updated_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('user_id').notNullable()

      table.uuid('post_id').notNullable()

      table
        .foreign('user_id', 'fk_comments_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('post_id', 'fk_comments_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['user_id'], 'idx_comments_user_id')
      table.index(['post_id'], 'idx_comments_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
