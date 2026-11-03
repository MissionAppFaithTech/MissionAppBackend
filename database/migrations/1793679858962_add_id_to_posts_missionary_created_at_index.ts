import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // NOTE: a paginação por cursor ordena por (created_at, id) DESC dentro de um
      // missionário (ADR-0033); o id no índice cobre o desempate sem ordenação extra.
      table.dropIndex(['missionary_id', 'created_at'], 'idx_posts_missionary_id_created_at')
      table.index(['missionary_id', 'created_at', 'id'], 'idx_posts_missionary_id_created_at_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(
        ['missionary_id', 'created_at', 'id'],
        'idx_posts_missionary_id_created_at_id'
      )
      table.index(['missionary_id', 'created_at'], 'idx_posts_missionary_id_created_at')
    })
  }
}
