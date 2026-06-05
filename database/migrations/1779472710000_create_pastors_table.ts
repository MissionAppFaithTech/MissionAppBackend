import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pastors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Pastores responsáveis por comunidades de fé. Sempre vinculados a uma faith_community; exibidos como referência eclesiástica no cadastro e configurações de conta.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('full_name')
        .notNullable()
        .comment('Nome completo do pastor responsável pela comunidade')
      table
        .string('phone_number')
        .notNullable()
        .comment('Telefone de contato do pastor; formato internacional E.164 (ex: +5511912345678)')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')

      // FK: CASCADE — pastor é excluído junto com sua comunidade de fé
      table
        .uuid('faith_community_id')
        .notNullable()
        .comment('Comunidade de fé à qual o pastor está vinculado')

      table
        .foreign('faith_community_id', 'fk_pastors_faith_community_id')
        .references('id')
        .inTable('faith_communities')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // listagem de pastores por comunidade para exibição e edição
      table.index(['faith_community_id'], 'idx_pastors_faith_community_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
