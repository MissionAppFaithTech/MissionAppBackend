import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // FK: SET NULL — o job de limpeza apaga tokens antigos; o elo some sem apagar o sucessor
      table
        .uuid('replaced_by_id')
        .nullable()
        .comment(
          'Token emitido na rotação que revogou este (ADR-0035); nulo quando a revogação veio de logout, troca de senha, revogação remota ou detecção de roubo. Permite seguir a cadeia até o descendente ativo dentro da janela de tolerância'
        )

      table
        .foreign('replaced_by_id', 'fk_refresh_tokens_replaced_by_id')
        .references('id')
        .inTable('refresh_tokens')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['replaced_by_id'], 'fk_refresh_tokens_replaced_by_id')
      table.dropColumn('replaced_by_id')
    })
  }
}
