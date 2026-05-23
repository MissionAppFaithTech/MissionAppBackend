import { BaseSchema } from '@adonisjs/lucid/schema'
import { SystemAction } from '../../app/enums/user_action_audit/system_action_type.ts'

export default class extends BaseSchema {
  protected tableName = 'user_action_audits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.enum('action_type', Object.values(SystemAction)).notNullable()
      table.string('ip_address').nullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('actor_id').nullable()
      table.uuid('target_id').nullable()

      table
        .foreign('actor_id', 'fk_user_action_audits_actor_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table
        .foreign('target_id', 'fk_user_action_audits_target_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.index(['actor_id'], 'idx_user_action_audits_actor_id')
      table.index(['target_id'], 'idx_user_action_audits_target_id')
      table.index(['action_type'], 'idx_user_action_audits_action_type')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
