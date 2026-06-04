import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'campaign_projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()

      table.timestamp('created_at', { precision: 3, useTz: true }).notNullable()

      table.uuid('campaign_id').notNullable()

      table.uuid('project_id').notNullable()

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

      table.unique(['campaign_id', 'project_id'], {
        indexName: 'uq_campaign_projects_campaign_id_project_id',
      })

      table.index(['campaign_id'], 'idx_campaign_projects_campaign_id')
      table.index(['project_id'], 'idx_campaign_projects_project_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
