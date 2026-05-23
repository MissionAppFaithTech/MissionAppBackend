import { BaseSchema } from '@adonisjs/lucid/schema'
import { BankAccountType } from '../../app/enums/financial_config/bank_account_type.ts'

export default class extends BaseSchema {
  protected tableName = 'financial_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('pix_key').nullable()
      table.string('qr_code_url').nullable()

      table.string('bank_name').nullable()
      table.string('bank_number').nullable()
      table.string('agency').nullable()
      table.string('account_number').nullable()
      table.enum('account_type', Object.values(BankAccountType)).nullable()
      table.string('holder_name').nullable()
      table.string('holder_document').nullable()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('updated_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('missionary_id').notNullable()

      table
        .foreign('missionary_id', 'fk_financial_configs_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['missionary_id'], { indexName: 'uq_financial_configs_missionary_id' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
