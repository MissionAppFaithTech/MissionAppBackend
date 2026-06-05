import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionary_agencies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Agências missionárias disponíveis para vínculo no cadastro do missionário. Selecionadas via menu select no frontend; novas agências podem ser cadastradas pelo próprio missionário.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('name')
        .notNullable()
        .comment('Nome da agência missionária exibido no select de cadastro')
      table
        .string('phone_number')
        .nullable()
        .comment(
          'Telefone público de contato com a agência; opcional; formato internacional E.164 (ex: +5511912345678)'
        )
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')

      // FK: SET NULL — agência permanece ativa mesmo se o usuário que a cadastrou for excluído
      table.uuid('user_id').nullable().comment('Usuário que cadastrou a agência; null se excluído')

      table
        .foreign('user_id', 'fk_missionary_agencies_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      // busca por nome no select de agências durante cadastro do missionário
      table.index(['name'], 'idx_missionary_agencies_name')
      table.index(['user_id'], 'idx_missionary_agencies_user_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
