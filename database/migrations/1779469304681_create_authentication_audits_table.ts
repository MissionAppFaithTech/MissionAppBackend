import { AuthenticationStatus } from '#enums/authentication_audit/authentication_status'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'authentication_audits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Registro imutável de todas as tentativas de autenticação (login). Base para auditoria de segurança, detecção de força bruta e rate limiting por IP.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('ip_address')
        .nullable()
        .comment('IP de origem da tentativa de autenticação; base para rate limiting')
      table
        .string('remote_port')
        .nullable()
        .comment('Porta da conexão; contexto complementar de rede')
      table
        .string('user_agent')
        .nullable()
        .comment('Header User-Agent completo do cliente (browser, app, bot)')
      table
        .string('browser')
        .nullable()
        .comment('Browser ou cliente parseado do user_agent para exibição legível')
      table
        .enum('status', Object.values(AuthenticationStatus))
        .notNullable()
        .comment('Resultado da tentativa: sucesso, falha ou bloqueado por rate limiting')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Timestamp da tentativa de autenticação')

      // FK: SET NULL — preserva histórico de auditoria mesmo após exclusão da conta
      table
        .uuid('user_id')
        .nullable()
        .comment('Usuário que tentou autenticar; null se a conta foi excluída')

      table
        .foreign('user_id', 'fk_authentication_audits_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      // índice composto: consultas de histórico de segurança por usuário filtradas por status e período
      table.index(
        ['user_id', 'status', 'created_at'],
        'idx_authentication_audits_user_id_status_created_at'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
