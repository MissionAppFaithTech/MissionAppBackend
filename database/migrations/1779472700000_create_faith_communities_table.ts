import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'faith_communities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Comunidades de fé (igrejas) vinculadas a apoiadores e missionários no cadastro. Selecionadas via select no frontend; novas comunidades podem ser criadas pelo próprio usuário.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('name')
        .notNullable()
        .comment('Nome da comunidade de fé/igreja exibido no select de cadastro')
      table
        .string('phone_number')
        .notNullable()
        .comment('Telefone de contato da igreja; formato internacional E.164 (ex: +5511912345678)')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')

      // FK: SET NULL — comunidade permanece ativa mesmo se o usuário que a cadastrou for excluído
      table
        .uuid('user_id')
        .nullable()
        .comment('Usuário que cadastrou a comunidade; null se excluído')

      table
        .foreign('user_id', 'fk_faith_communities_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      // busca por nome no select de comunidades durante cadastro
      table.index(['name'], 'idx_faith_communities_name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
