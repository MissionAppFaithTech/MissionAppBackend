import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * PIX só com chave (ADR-0039): o QR Code estático deixa de existir. Remove a FK
 * e a coluna que apontavam para a imagem em `media_assets`. Os assets órfãos
 * continuam em `media_assets` e no storage; nenhum endpoint chegou a gravá-los.
 */
export default class extends BaseSchema {
  protected tableName = 'financial_configs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['qr_code_asset_id'], 'fk_financial_configs_qr_code_asset_id')
      table.dropColumn('qr_code_asset_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // FK: SET NULL — remoção do asset apenas anula o QR Code, sem afetar o restante da config
      table
        .uuid('qr_code_asset_id')
        .nullable()
        .comment('FK para media_assets; imagem do QR Code estático Pix; null se não configurado')

      table
        .foreign('qr_code_asset_id', 'fk_financial_configs_qr_code_asset_id')
        .references('id')
        .inTable('media_assets')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
    })
  }
}
