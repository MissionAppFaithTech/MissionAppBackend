import { MediaAssetPurpose } from '#enums/media_asset/media_asset_purpose'
import { MediaAssetStatus } from '#enums/media_asset/media_asset_status'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('purpose', Object.values(MediaAssetPurpose))
        .nullable()
        .comment(
          'Finalidade do arquivo (capa/vídeo de projeto, imagem de post); define regras de mime, tamanho e compressão; null em registros anteriores ao upload direto'
        )
      table
        .enum('status', Object.values(MediaAssetStatus))
        .notNullable()
        .defaultTo(MediaAssetStatus.READY)
        .comment(
          'Ciclo de vida do arquivo: aguardando upload, em processamento (validação/compressão), pronto para exibição ou falhou'
        )

      // FK: SET NULL — o arquivo continua referenciado por posts/projetos mesmo que o autor seja removido
      table
        .uuid('uploaded_by_user_id')
        .nullable()
        .comment(
          'Usuário que solicitou o upload; apenas ele pode vincular o arquivo a um recurso; null em registros legados'
        )

      table
        .foreign('uploaded_by_user_id', 'fk_media_assets_uploaded_by_user_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      // listagem de arquivos de um usuário e varredura de uploads abandonados
      table.index(['uploaded_by_user_id', 'status'], 'idx_media_assets_uploaded_by_user_id_status')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(
        ['uploaded_by_user_id', 'status'],
        'idx_media_assets_uploaded_by_user_id_status'
      )
      table.dropForeign(['uploaded_by_user_id'], 'fk_media_assets_uploaded_by_user_id')
      table.dropColumn('uploaded_by_user_id')
      table.dropColumn('status')
      table.dropColumn('purpose')
    })
  }
}
