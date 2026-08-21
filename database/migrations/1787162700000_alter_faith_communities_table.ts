import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'faith_communities'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // TODO: promover cidade, estado e país a NOT NULL quando existir endpoint de
      // cadastro de comunidade de fé; hoje nenhum caminho de escrita consegue preenchê-los
      table
        .string('address_line_1')
        .nullable()
        .comment('Primeira linha do endereço da comunidade de fé (logradouro e número)')
      table
        .string('address_line_2')
        .nullable()
        .comment('Segunda linha do endereço; complemento, bairro ou referência adicional')
      table.string('city').nullable().comment('Cidade onde a comunidade de fé está localizada')
      table
        .string('state')
        .nullable()
        .comment('Estado ou província onde a comunidade de fé está localizada')
      table.string('country').nullable().comment('País onde a comunidade de fé está localizada')
      table
        .string('postal_code')
        .nullable()
        .comment('CEP ou código postal do endereço da comunidade de fé')
      table
        .string('website')
        .nullable()
        .comment('URL do site institucional da comunidade de fé, se houver')

      // NOTE: relaxando para opcional: telefone da comunidade de fé passa a ser informação de contato adicional, não obrigatória no cadastro
      table
        .string('phone_number')
        .nullable()
        .comment(
          'Telefone de contato da igreja; opcional; formato internacional E.164 (ex: +5511912345678)'
        )
        .alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('phone_number')
        .notNullable()
        .comment('Telefone de contato da igreja; formato internacional E.164 (ex: +5511912345678)')
        .alter()

      table.dropColumn('website')
      table.dropColumn('postal_code')
      table.dropColumn('country')
      table.dropColumn('state')
      table.dropColumn('city')
      table.dropColumn('address_line_2')
      table.dropColumn('address_line_1')
    })
  }
}
