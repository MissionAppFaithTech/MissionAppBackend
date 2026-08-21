import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionary_agencies'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // TODO: promover cidade, estado, país e telefone a NOT NULL quando existir endpoint
      // de cadastro de agência; hoje nenhum caminho de escrita consegue preenchê-los
      table
        .string('address_line_1')
        .nullable()
        .comment('Primeira linha do endereço da agência missionária (logradouro e número)')
      table
        .string('address_line_2')
        .nullable()
        .comment('Segunda linha do endereço; complemento, bairro ou referência adicional')
      table.string('city').nullable().comment('Cidade onde a agência missionária está localizada')
      table
        .string('state')
        .nullable()
        .comment('Estado ou província onde a agência missionária está localizada')
      table.string('country').nullable().comment('País onde a agência missionária está localizada')
      table
        .string('postal_code')
        .nullable()
        .comment('CEP ou código postal do endereço da agência missionária')
      table
        .string('website')
        .nullable()
        .comment('URL do site institucional da agência missionária, se houver')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
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
