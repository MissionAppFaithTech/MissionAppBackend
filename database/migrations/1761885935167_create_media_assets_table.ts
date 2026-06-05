import { BaseSchema } from '@adonisjs/lucid/schema'
import { Provider } from '../../app/enums/media_asset/provider'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Registro centralizado de todos os arquivos enviados ao storage (fotos de perfil, imagens de posts, capas de projetos, vídeos). Referenciado por outras tabelas via FK; nunca deletado diretamente enquanto referenciado.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .enum('provider', Object.values(Provider))
        .notNullable()
        .defaultTo(Provider.S3)
        .comment(
          'Provedor de armazenamento do arquivo (S3/R2/GCS/Azure em produção, MinIO em dev — ADR-0004)'
        )
      table
        .string('bucket')
        .notNullable()
        .comment('Nome do bucket de armazenamento conforme convenção de nomenclatura (ADR-0009)')
      table
        .string('file_key')
        .notNullable()
        .comment('Caminho e nome do arquivo dentro do bucket; único por provider + bucket')

      table
        .string('mime_type')
        .notNullable()
        .comment('Tipo MIME do arquivo (ex: image/jpeg, video/mp4); controla exibição no cliente')
      table
        .integer('file_size_bytes')
        .unsigned()
        .notNullable()
        .comment('Tamanho do arquivo em bytes; usado para validar limites de tamanho')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')

      // garante que o mesmo arquivo não seja registrado duas vezes no mesmo bucket
      table.unique(['provider', 'bucket', 'file_key'], { indexName: 'uq_media_assets_identity' })

      table.check('?? >= 0', ['file_size_bytes'], 'chk_media_assets_file_size_bytes_non_negative')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
