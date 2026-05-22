import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'faith_communities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable()
      table.string('phone_number').notNullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('user_id').nullable()

      table
        .foreign('user_id', 'fk_faith_communities_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.index(['name'], 'idx_faith_communities_name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
