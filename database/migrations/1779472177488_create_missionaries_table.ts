import { IdentityType } from '#enums/missionary/identity_type'
import { MissionaryStatus } from '#enums/missionary/missionary_status'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'missionaries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Perfil estendido do usuário com role MISSIONARY. Armazena dados específicos do ministério, status de aprovação pelo admin e configurações públicas de contato e doação.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .enum('status', Object.values(MissionaryStatus))
        .notNullable()
        .defaultTo(MissionaryStatus.PENDING_APPROVAL)
        .comment('Status de aprovação pelo admin: pendente, aprovado ou rejeitado')

      table
        .enum('identity_type', Object.values(IdentityType))
        .nullable()
        .comment(
          'Tipo do documento de identidade (CPF, CNPJ, passaporte); deve ser preenchido junto com identity_document'
        )
      table
        .string('identity_document')
        .nullable()
        .comment('Número do documento de identidade; deve ser preenchido junto com identity_type')

      table
        .string('public_email')
        .nullable()
        .comment('Email exibido publicamente no perfil para contato')
      table
        .string('public_phone')
        .nullable()
        .comment(
          'Telefone exibido publicamente no perfil para contato; formato internacional E.164 (ex: +5511912345678)'
        )
      table
        .text('donation_message')
        .nullable()
        .comment('Mensagem de apelo ou agradecimento exibida na área de doações')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data do cadastro do missionário')

      // FK: CASCADE — perfil de missionário é excluído junto com a conta do usuário
      table
        .uuid('user_id')
        .notNullable()
        .comment('Usuário base do missionário; relação 1:1 garantida pela unique constraint')
      // FK: RESTRICT — impede exclusão de agência enquanto houver missionários vinculados
      table
        .uuid('missionary_agency_id')
        .notNullable()
        .comment('Agência missionária à qual o missionário pertence')

      table
        .foreign('user_id', 'fk_missionaries_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('missionary_agency_id', 'fk_missionaries_missionary_agency_id')
        .references('id')
        .inTable('missionary_agencies')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      // garante relação 1:1 entre user e missionary
      table.unique(['user_id'], { indexName: 'uq_missionaries_user_id' })

      // identity_type e identity_document devem ser ambos preenchidos ou ambos nulos
      table.check(
        '((identity_type IS NULL AND identity_document IS NULL) OR (identity_type IS NOT NULL AND identity_document IS NOT NULL))',
        [],
        'chk_missionaries_identity_consistency'
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
