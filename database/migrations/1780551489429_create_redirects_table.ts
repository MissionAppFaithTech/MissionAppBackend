import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'redirects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Regras de redirecionamento de rotas HTTP da plataforma. Permite gerenciar mudanças de URL sem quebrar links existentes (301 permanente) ou redirecionamentos temporários (302).'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('source_path', 512)
        .notNullable()
        .comment('Caminho de origem da requisição a ser redirecionada (ex: /old-path)')
      table
        .string('destination_path', 512)
        .notNullable()
        .comment('Caminho de destino após o redirecionamento (ex: /new-path)')
      table
        .integer('status_code')
        .notNullable()
        .defaultTo(301)
        .comment('Código HTTP do redirecionamento: 301 permanente ou 302 temporário')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação da regra de redirecionamento')

      // lookup rápido de regras de redirecionamento por rota de entrada
      table.index(['source_path', 'destination_path'], 'idx_redirects_source_path_destination_path')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
