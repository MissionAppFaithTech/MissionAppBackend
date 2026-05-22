import { BaseSchema } from '@adonisjs/lucid/schema'
import { IdentityType } from '../../app/enums/missionary/identity_type.ts'
import { MissionaryStatus } from '../../app/enums/missionary/missionary_status.ts'

export default class extends BaseSchema {
  protected tableName = 'missionaries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table
        .enum('status', Object.values(MissionaryStatus))
        .notNullable()
        .defaultTo(MissionaryStatus.PENDING_APPROVAL)

      table.string('public_email').nullable()
      table.string('public_phone').nullable()
      table.text('donation_message').nullable()
      table.enum('identity_type', Object.values(IdentityType)).nullable()
      table.string('identity_document').nullable()
      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('user_id').notNullable()

      table.uuid('missionary_agency_id').notNullable()

      table
        .foreign('user_id', 'fk_missionaries_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('missionary_agency_id', 'fk_missionaries_missionary_agency_id')
        .references('id')
        .inTable('missionary_agencies')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      table.unique(['user_id'], { indexName: 'uq_missionaries_user_id' })

      table.check(
        '((identity_type IS NULL AND identity_document IS NULL) OR (identity_type IS NOT NULL AND identity_document IS NOT NULL))',
        [],
        'chk_missionaries_identity_consistency'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
