import { BaseSchema } from '@adonisjs/lucid/schema'
import { Provider } from '../../app/enums/media_asset/provider.ts'

export default class extends BaseSchema {
  protected tableName = 'media_assets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.enum('provider', Object.values(Provider)).notNullable().defaultTo(Provider.S3)
      table.string('bucket').notNullable()
      table.string('file_key').notNullable()

      table.string('mime_type').notNullable()
      table.integer('file_size_bytes').unsigned().notNullable()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()
      table.timestamp('updated_at', { precision: 3, useTz: true }).notNullable()

      table.unique(['provider', 'bucket', 'file_key'], { indexName: 'uq_media_assets_identity' })

      table.check('?? >= 0', ['file_size_bytes'], 'chk_media_assets_file_size_bytes_non_negative')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
