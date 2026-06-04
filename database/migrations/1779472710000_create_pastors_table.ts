import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pastors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('full_name').notNullable()
      table.string('phone_number').notNullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('faith_community_id').notNullable()

      table
        .foreign('faith_community_id', 'fk_pastors_faith_community_id')
        .references('id')
        .inTable('faith_communities')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.index(['faith_community_id'], 'idx_pastors_faith_community_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
