import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'auth_access_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Tokens de acesso Bearer emitidos no login. Gerenciados pelo AdonisJS Auth (DbAccessTokensProvider). Cada registro representa uma sessão ativa de um usuário.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      // FK: CASCADE — token é excluído junto com o usuário dono
      table.uuid('tokenable_id').notNullable().comment('Usuário dono do token; FK para users')

      table.string('type').notNullable().comment('Tipo do token (ex: bearer)')
      table.string('name').nullable().comment('Nome descritivo do token (opcional)')
      table
        .string('hash')
        .notNullable()
        .comment('Hash criptográfico do valor do token para validação segura')
      table.text('abilities').notNullable().comment('Lista de permissões do token em formato JSON')
      table.timestamp('created_at').notNullable().comment('Data de criação do token')
      table.timestamp('updated_at').notNullable().comment('Data da última atualização')
      table
        .timestamp('last_used_at')
        .nullable()
        .comment('Último uso do token; útil para auditoria e expiração por inatividade')
      table
        .timestamp('expires_at')
        .nullable()
        .comment('Data de expiração; null indica token sem expiração')

      table
        .foreign('tokenable_id', 'fk_auth_access_tokens_tokenable_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
