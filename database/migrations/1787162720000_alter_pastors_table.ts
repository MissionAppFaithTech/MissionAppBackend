import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pastors'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // NOTE: telefone do pastor passa a ser opcional no cadastro da comunidade de fé
      table
        .string('phone_number')
        .nullable()
        .comment(
          'Telefone de contato do pastor; opcional; formato internacional E.164 (ex: +5511912345678)'
        )
        .alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('phone_number')
        .notNullable()
        .comment('Telefone de contato do pastor; formato internacional E.164 (ex: +5511912345678)')
        .alter()
    })
  }
}
