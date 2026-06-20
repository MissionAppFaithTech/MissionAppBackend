import { BankAccountType } from '#enums/financial_config/bank_account_type'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'financial_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Configuração de recebimento de doações do missionário. Armazena dados de Pix e transferência bancária. Relação 1:1 com missionaries. Dados sensíveis sujeitos a criptografia em repouso.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .string('pix_key')
        .nullable()
        .comment('Chave Pix do missionário para recebimento de doações')

      table.string('bank_name').nullable().comment('Nome do banco para transferência bancária')
      table
        .string('bank_number')
        .nullable()
        .comment('Código do banco (ex: 001 para Banco do Brasil')
      table.string('agency').nullable().comment('Número da agência bancária')
      table.string('account_number').nullable().comment('Número da conta com dígito verificador')
      table.string('holder_name').nullable().comment('Nome completo do titular da conta bancária')
      table
        .string('holder_document')
        .nullable()
        .comment('CPF ou CNPJ do titular; dado sensível sujeito a criptografia em repouso')
      table
        .enum('account_type', Object.values(BankAccountType))
        .nullable()
        .comment('Tipo de conta: corrente, poupança ou pagamento')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')
      table
        .timestamp('updated_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data da última atualização das configurações financeiras')

      // FK: SET NULL — remoção do asset apenas anula o QR Code, sem afetar o restante da config
      table
        .uuid('qr_code_asset_id')
        .nullable()
        .comment('FK para media_assets; imagem do QR Code estático Pix; null se não configurado')

      // FK: CASCADE — configuração financeira é excluída junto com o missionário; unique garante relação 1:1
      table
        .uuid('missionary_id')
        .notNullable()
        .comment(
          'Missionário dono da configuração financeira; relação 1:1 garantida pela unique constraint'
        )

      table
        .foreign('qr_code_asset_id', 'fk_financial_configs_qr_code_asset_id')
        .references('id')
        .inTable('media_assets')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')

      table
        .foreign('missionary_id', 'fk_financial_configs_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // garante que cada missionário tenha no máximo uma configuração financeira
      table.unique(['missionary_id'], { indexName: 'uq_financial_configs_missionary_id' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
