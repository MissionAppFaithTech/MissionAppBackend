import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaigns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Campanhas de promoção de projetos gerenciadas pelo admin. Controlam quais projetos aparecem em destaque na área de exploração para todos os usuários.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('name')
        .notNullable()
        .comment('Nome da campanha definido pelo admin (ex: "Semana de missões batista"')
      table
        .boolean('is_active')
        .notNullable()
        .defaultTo(false)
        .comment(
          'Controle mestre de visibilidade: true exibe a lista curada para todos os usuários'
        )
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação da campanha')

      table
        .timestamp('start_date', { precision: 3, useTz: true })
        .nullable()
        .comment('Data de início programada para a campanha; opcional')
      table
        .timestamp('suspended_at', { precision: 3, useTz: true })
        .nullable()
        .comment('Data em que o admin desativou a campanha manualmente; null se nunca suspensa')
      table
        .timestamp('end_date', { precision: 3, useTz: true })
        .nullable()
        .comment('Data de encerramento previsto da campanha; opcional')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
