import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.uuid('follower_id').notNullable()
      table.uuid('following_id').notNullable()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table
        .foreign('follower_id', 'fk_followers_follower_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('following_id', 'fk_followers_following_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['follower_id'], 'idx_followers_follower_id')
      table.index(['following_id'], 'idx_followers_following_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
