import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionary_work_addresses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Endereço atualizado do campo de atuação missionária. Relação 1:1 com missionaries. Campo relevante para missões internacionais e exibição geográfica no perfil.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table.string('zip').notNullable().comment('CEP do local de atuação missionária')
      table.string('district').notNullable().comment('Bairro do local de atuação')
      table.string('city').notNullable().comment('Cidade de atuação')
      table.string('state').notNullable().comment('Estado ou província de atuação')
      table
        .string('country')
        .notNullable()
        .comment('País de atuação; relevante para missões internacionais')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')

      // FK: CASCADE — endereço é excluído junto com o missionário; unique garante relação 1:1
      table
        .uuid('missionary_id')
        .notNullable()
        .comment(
          'Missionário ao qual o endereço pertence; relação 1:1 garantida pela unique constraint'
        )

      table
        .foreign('missionary_id', 'fk_missionary_work_addresses_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // garante que cada missionário tenha no máximo um endereço de trabalho
      table.unique(['missionary_id'], { indexName: 'uq_missionary_work_addresses_missionary_id' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
