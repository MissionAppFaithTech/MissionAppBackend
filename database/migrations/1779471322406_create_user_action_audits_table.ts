import { SystemAction } from '#enums/user_action_audit/system_action_type'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_action_audits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Trilha de auditoria de ações administrativas sensíveis (aprovações, exclusões). Exigida para rastreabilidade e conformidade com LGPD.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .enum('action_type', Object.values(SystemAction))
        .notNullable()
        .comment(
          'Tipo de ação sensível registrada (aprovação de missionário, exclusão de conta, etc.)'
        )
      table
        .jsonb('metadata')
        .nullable()
        .comment('Estrutura dos dados modificados antes e depois da ação para fins de auditoria')
      table
        .string('ip_address')
        .nullable()
        .comment('IP de origem da ação para rastreabilidade e conformidade LGPD')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Timestamp da ação')

      // FK: SET NULL — mantém trilha de auditoria mesmo após exclusão do usuário que agiu
      table
        .uuid('actor_id')
        .nullable()
        .comment('Usuário que executou a ação (admin ou sistema); null se a conta foi excluída')
      // FK: SET NULL — mantém registro mesmo após exclusão do usuário alvo
      table
        .uuid('target_id')
        .nullable()
        .comment('Usuário sobre quem a ação foi aplicada; null se a conta foi excluída')

      table
        .foreign('actor_id', 'fk_user_action_audits_actor_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table
        .foreign('target_id', 'fk_user_action_audits_target_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      // índices individuais: listagem de ações por ator, por alvo e por tipo de ação
      table.index(['actor_id'], 'idx_user_action_audits_actor_id')
      table.index(['target_id'], 'idx_user_action_audits_target_id')
      table.index(['action_type'], 'idx_user_action_audits_action_type')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
