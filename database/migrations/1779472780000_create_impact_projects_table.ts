import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'impact_projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Projetos de impacto criados por missionários como vitrine principal da sua causa. Exibidos em destaque no perfil e na área de exploração; base da curadoria de campanhas pelo admin.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table.string('title').notNullable().comment('Título descritivo do projeto de impacto')
      table
        .text('description')
        .notNullable()
        .comment('Descrição detalhada do projeto; exibida no perfil do missionário')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do projeto')
      table
        .timestamp('updated_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data da última edição')

      // FK: CASCADE — projetos são excluídos junto com o missionário; apenas missionários criam projetos
      table
        .uuid('missionary_id')
        .notNullable()
        .comment('Missionário dono do projeto; apenas missionários possuem projetos de impacto')

      // FK: RESTRICT — impede remoção do asset de capa enquanto o projeto existir
      table
        .uuid('cover_image_asset_id')
        .notNullable()
        .comment('Imagem de capa obrigatória do projeto em media_assets')

      // FK: RESTRICT — impede remoção do asset de vídeo enquanto o projeto existir
      table
        .uuid('video_asset_id')
        .nullable()
        .comment('Vídeo opcional do projeto em media_assets; null se não informado')

      table
        .foreign('missionary_id', 'fk_impact_projects_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('cover_image_asset_id', 'fk_impact_projects_cover')
        .references('id')
        .inTable('media_assets')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      table
        .foreign('video_asset_id', 'fk_impact_projects_video')
        .references('id')
        .inTable('media_assets')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      // Índice único — garante um único projeto por missionário; otimiza listagem e curadoria
      table.unique(['missionary_id'], { indexName: 'uq_impact_projects_missionary_id' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
