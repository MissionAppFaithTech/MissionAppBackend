import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('likes_count')
        .unsigned()
        .notNullable()
        .defaultTo(0)
        .comment(
          'Contador desnormalizado de curtidas; deltas acumulados no Dragonfly e aplicados pelo job de flush (ADR-0033)'
        )

      table.check('likes_count >= 0', [], 'chk_posts_likes_count_non_negative')
    })

    this.schema.raw(
      'UPDATE posts p SET likes_count = (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)'
    )
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropChecks(['chk_posts_likes_count_non_negative'])
      table.dropColumn('likes_count')
    })
  }
}
