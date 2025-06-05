import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  // tabela de junção entre campaigns e impact_projects
  protected tableName = 'campaign_projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Tabela de junção entre campaigns e impact_projects. Define quais projetos compõem cada campanha de promoção. Unique constraint impede duplicatas na mesma campanha.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data em que o projeto foi adicionado à campanha pelo admin')

      // FK: CASCADE — vínculo é excluído junto com a campanha ou o projeto
      table.uuid('campaign_id').notNullable().comment('Campanha à qual o projeto pertence')
      // FK: CASCADE — vínculo é excluído junto com a campanha ou o projeto
      table
        .uuid('project_id')
        .notNullable()
        .comment('Projeto de impacto incluído na campanha pelo admin')

      table
        .foreign('campaign_id', 'fk_campaign_projects_campaign_id')
        .references('id')
        .inTable('campaigns')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('project_id', 'fk_campaign_projects_project_id')
        .references('id')
        .inTable('impact_projects')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // impede adição do mesmo projeto duas vezes na mesma campanha
      table.unique(['campaign_id', 'project_id'], {
        indexName: 'uq_campaign_projects_campaign_id_project_id',
      })

      // listagem de projetos de uma campanha; listagem de campanhas de um projeto
      table.index(['campaign_id'], 'idx_campaign_projects_campaign_id')
      table.index(['project_id'], 'idx_campaign_projects_project_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
