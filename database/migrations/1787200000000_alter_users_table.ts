import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // FK: SET NULL — mantém a conta mesmo se a comunidade for removida
      table
        .uuid('faith_community_id')
        .nullable()
        .comment('Comunidade de fé vinculada ao usuário para exibição no cabeçalho do perfil')

      table
        .foreign('faith_community_id', 'fk_users_faith_community_id')
        .references('id')
        .inTable('faith_communities')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.index(['faith_community_id'], 'idx_users_faith_community_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['faith_community_id'], 'idx_users_faith_community_id')
      table.dropForeign(['faith_community_id'], 'fk_users_faith_community_id')
      table.dropColumn('faith_community_id')
    })
  }
}
