import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionaries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .text('about_me')
        .nullable()
        .comment('Texto livre da seção "Sobre mim" exibida no perfil público do missionário')
      table
        .text('mission_story_summary')
        .nullable()
        .comment('Resumo da história em missões exibido na seção de apresentação')

      table
        .string('origin_location')
        .nullable()
        .comment('Local de origem informado pelo missionário para exibição pública')
      table
        .text('prayer_request')
        .nullable()
        .comment('Pedido de oração exibido no perfil para intercessão dos apoiadores')
      table
        .string('life_verse', 255)
        .nullable()
        .comment('Versículo para a vida informado no perfil público do missionário')

      // FK: SET NULL — mantém o perfil missionário mesmo se a comunidade for removida
      table
        .uuid('faith_community_id')
        .nullable()
        .comment('Comunidade de fé vinculada ao missionário para exibição no perfil')

      table
        .foreign('faith_community_id', 'fk_missionaries_faith_community_id')
        .references('id')
        .inTable('faith_communities')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table.index(['faith_community_id'], 'idx_missionaries_faith_community_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['faith_community_id'], 'idx_missionaries_faith_community_id')
      table.dropForeign(['faith_community_id'], 'fk_missionaries_faith_community_id')
      table.dropColumn('faith_community_id')

      table.dropColumn('life_verse')
      table.dropColumn('prayer_request')
      table.dropColumn('origin_location')
      table.dropColumn('mission_story_summary')
      table.dropColumn('about_me')
    })
  }
}