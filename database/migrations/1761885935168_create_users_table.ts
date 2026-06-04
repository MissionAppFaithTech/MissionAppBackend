import { BaseSchema } from '@adonisjs/lucid/schema'
import { Gender } from '../../app/enums/user/gender.ts'
import { MembershipStatus } from '../../app/enums/user/membership_status.ts'
import { UserRole } from '../../app/enums/user/user_role.ts'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.string('full_name').nullable()
      table.string('username').notNullable()
      table.string('phone_number').notNullable()
      table.string('profile_picture').nullable()
      table.text('biography').nullable()

      table
        .enum('membership_status', Object.values(MembershipStatus))
        .notNullable()
        .defaultTo(MembershipStatus.PENDING_EMAIL)
      table.timestamp('actived_at', { precision: 3, useTz: true }).nullable()

      table.enum('role', Object.values(UserRole)).notNullable().defaultTo(UserRole.SUPPORTER)
      table.enum('gender', Object.values(Gender)).notNullable()

      table.string('email').notNullable()
      table.timestamp('email_verified_at', { precision: 3, useTz: true }).nullable()
      table.string('password_hash').notNullable()

      table.string('recovery_password_token').nullable()
      table
        .timestamp('recovery_password_token_expires_at', { precision: 3, useTz: true })
        .nullable()

      table.string('pending_email').nullable()
      table.string('pending_email_token').nullable()
      table.timestamp('pending_email_token_expires_at', { precision: 3, useTz: true }).nullable()

      table.integer('followers_count').unsigned().notNullable().defaultTo(0)
      table.integer('following_count').unsigned().notNullable().defaultTo(0)

      table.integer('login_attempts').unsigned().notNullable().defaultTo(0)
      table.timestamp('last_login', { precision: 3, useTz: true }).nullable()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('updated_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('deleted_at', { precision: 3, useTz: true }).nullable()

      table.unique(['username'], { indexName: 'uq_users_username' })
      table.unique(['email'], { indexName: 'uq_users_email' })
      table.unique(['recovery_password_token'], { indexName: 'uq_users_recovery_password_token' })

      table.check('?? >= 0', ['followers_count'], 'chk_users_followers_count_non_negative')
      table.check('?? >= 0', ['following_count'], 'chk_users_following_count_non_negative')
      table.check('?? >= 0', ['login_attempts'], 'chk_users_login_attempts_non_negative')

      table.index(['membership_status'], 'idx_users_membership_status')
      table.index(['role'], 'idx_users_role')
      table.index(['email'], 'idx_users_email')
      table.index(['pending_email_token'], 'idx_users_pending_email_token')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
