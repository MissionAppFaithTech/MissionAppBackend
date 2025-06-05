import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Refresh tokens opacos de longa duração para renovação de access tokens JWT. Armazenados como hash SHA-256 — o valor bruto nunca é persistido. Implementa rotation com family tracking para detecção de roubo de token.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('token_hash', 64)
        .notNullable()
        .comment('Hash SHA-256 do valor bruto do token; o valor original nunca é persistido')
      table
        .uuid('family_id')
        .notNullable()
        .comment(
          'Agrupa todos os tokens de uma mesma sessão de login; usado para invalidar a família inteira ao detectar reuso de token revogado'
        )
      table
        .timestamp('expires_at', { precision: 3, useTz: true })
        .notNullable()
        .comment(
          'Expiração absoluta do token; tokens expirados são rejeitados mesmo se não revogados'
        )
      table
        .timestamp('revoked_at', { precision: 3, useTz: true })
        .nullable()
        .comment('Preenchido na revogação explícita; null indica token ainda válido')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de emissão do token')

      // FK: CASCADE — tokens são excluídos junto com o usuário proprietário
      table.uuid('user_id').notNullable().comment('Usuário proprietário do token')

      table
        .foreign('user_id', 'fk_refresh_tokens_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['token_hash'], { indexName: 'uq_refresh_tokens_token_hash' })

      table.index(['user_id'], 'idx_refresh_tokens_user_id')
      table.index(['family_id'], 'idx_refresh_tokens_family_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
