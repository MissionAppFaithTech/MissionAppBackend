import { IMPACT_PROJECT_VIDEO_URL_MAX_LENGTH } from '#constants/impact_project'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * O vídeo do projeto de impacto é um link externo convertido para embed (RF 9.2,
 * ADR-0040), não um arquivo enviado: sai a FK para `media_assets` e entra
 * `video_url`. Nenhum vídeo chegou a ser enviado em produção.
 */
export default class extends BaseSchema {
  protected tableName = 'impact_projects'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['video_asset_id'], 'fk_impact_projects_video')
      table.dropColumn('video_asset_id')
      table
        .string('video_url', IMPACT_PROJECT_VIDEO_URL_MAX_LENGTH)
        .nullable()
        .comment('Link de embed do vídeo (YouTube ou Vimeo) do projeto; null se não informado')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('video_url')
      // FK: RESTRICT — impede remoção do asset de vídeo enquanto o projeto existir
      table
        .uuid('video_asset_id')
        .nullable()
        .comment('Vídeo opcional do projeto em media_assets; null se não informado')
      table
        .foreign('video_asset_id', 'fk_impact_projects_video')
        .references('id')
        .inTable('media_assets')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')
    })
  }
}
