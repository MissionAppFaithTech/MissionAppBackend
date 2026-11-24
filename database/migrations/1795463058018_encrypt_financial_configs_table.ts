import { PixKeyType } from '#enums/financial_config/pix_key_type'
import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Os dados bancários passam a ser gravados cifrados com AES-256-GCM (chave
 * dedicada `FINANCIAL_DATA_ENCRYPTION_KEY`): as colunas sensíveis viram `text`
 * porque o texto cifrado é maior que o valor original. Código e nome do banco
 * e tipo de conta ficam em claro — são públicos e não identificam ninguém.
 */
export default class extends BaseSchema {
  protected tableName = 'financial_configs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('pix_key_type', Object.values(PixKeyType))
        .nullable()
        .comment(
          'Tipo da chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória); null quando o Pix não está configurado'
        )

      table
        .text('pix_key')
        .nullable()
        .comment('Chave Pix do missionário; cifrada com AES-256-GCM, nunca em texto plano')
        .alter()
      table
        .text('agency')
        .nullable()
        .comment('Número da agência bancária; cifrado com AES-256-GCM, nunca em texto plano')
        .alter()
      table
        .text('account_number')
        .nullable()
        .comment(
          'Número da conta com dígito verificador; cifrado com AES-256-GCM, nunca em texto plano'
        )
        .alter()
      table
        .text('holder_name')
        .nullable()
        .comment(
          'Nome completo do titular da conta bancária; cifrado com AES-256-GCM, nunca em texto plano'
        )
        .alter()
      table
        .text('holder_document')
        .nullable()
        .comment(
          'CPF ou CNPJ do titular, só com dígitos; cifrado com AES-256-GCM, nunca em texto plano'
        )
        .alter()
    })
  }

  async down() {
    // WARNING: o código anterior lê essas colunas em texto plano; o valor cifrado
    // não cabe em varchar(255) nem faria sentido para ele, por isso é descartado
    this.defer(async (db) => {
      await db.from(this.tableName).update({
        pix_key: null,
        agency: null,
        account_number: null,
        holder_name: null,
        holder_document: null,
      })
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pix_key_type')

      table
        .string('pix_key')
        .nullable()
        .comment('Chave Pix do missionário para recebimento de doações')
        .alter()
      table.string('agency').nullable().comment('Número da agência bancária').alter()
      table
        .string('account_number')
        .nullable()
        .comment('Número da conta com dígito verificador')
        .alter()
      table
        .string('holder_name')
        .nullable()
        .comment('Nome completo do titular da conta bancária')
        .alter()
      table
        .string('holder_document')
        .nullable()
        .comment('CPF ou CNPJ do titular; dado sensível sujeito a criptografia em repouso')
        .alter()
    })
  }
}
