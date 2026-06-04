import { BaseSchema } from '@adonisjs/lucid/schema'
import { AuthenticationStatus } from '../../app/enums/authentication_audit/authentication_status.ts'

export default class extends BaseSchema {
  protected tableName = 'authentication_audits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('ip_address').nullable()
      table.string('remote_port').nullable()
      table.string('user_agent').nullable()
      table.string('browser').nullable()
      table.enum('status', Object.values(AuthenticationStatus)).notNullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('user_id').nullable()

      table
        .foreign('user_id', 'fk_authentication_audits_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.index(
        ['user_id', 'status', 'created_at'],
        'idx_authentication_audits_user_id_status_created_at'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
