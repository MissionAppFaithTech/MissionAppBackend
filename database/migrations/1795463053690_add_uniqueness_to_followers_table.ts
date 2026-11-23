import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Seguir passa a ser idempotente e consistente com os contadores de
 * `users.followers_count`/`following_count`: o mesmo par só existe uma vez e
 * ninguém segue a si mesmo.
 */
export default class extends BaseSchema {
  protected tableName = 'followers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['follower_id', 'following_id'], {
        indexName: 'uq_followers_follower_id_following_id',
      })

      table.check('?? <> ??', ['follower_id', 'following_id'], 'chk_followers_not_self')

      // NOTE: o índice simples de follower_id fica coberto pelo índice da unique
      // (follower_id é a coluna da esquerda); o de following_id continua necessário
      table.dropIndex(['follower_id'], 'idx_followers_follower_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['follower_id'], 'idx_followers_follower_id')
      table.dropChecks(['chk_followers_not_self'])
      table.dropUnique(['follower_id', 'following_id'], 'uq_followers_follower_id_following_id')
    })
  }
}
