import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionaries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // NOTE: false por padrão — o perfil só oferece WhatsApp quando o missionário confirma
      table
        .boolean('public_phone_is_whatsapp')
        .notNullable()
        .defaultTo(false)
        .comment(
          'Indica se o telefone público aceita WhatsApp; habilita o contato por WhatsApp no perfil'
        )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('public_phone_is_whatsapp')
    })
  }
}
