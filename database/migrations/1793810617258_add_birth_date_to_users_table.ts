import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .date('birth_date')
        .nullable()
        .comment(
          'Data de nascimento informada no cadastro de missionário; dado privado, nunca exibido no perfil público; null em contas anteriores ou de apoiadores'
        )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('birth_date')
    })
  }
}
