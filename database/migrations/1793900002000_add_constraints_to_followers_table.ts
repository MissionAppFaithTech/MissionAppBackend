import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Prepara `followers` para o follow/unfollow idempotente (ADR-0033).
 *
 * - Unique `(follower_id, following_id)`: o `INSERT … ON CONFLICT DO NOTHING`
 *   do service depende dele para não contar o mesmo follow duas vezes.
 * - Check contra seguir a si mesmo.
 * - Índices `(lado, created_at, id)` para as listas por cursor, substituindo os
 *   índices simples de cada FK.
 * - Recalcula `users.followers_count` / `following_count`, que até aqui nunca
 *   foram atualizados.
 *
 * WARNING: a remoção de auto-follows e de duplicatas no `up()` é irreversível;
 * o `down()` só desfaz constraints e índices.
 */
export default class extends BaseSchema {
  protected tableName = 'followers'

  async up() {
    this.schema.raw('DELETE FROM followers WHERE follower_id = following_id')

    // NOTE: mantém o follow mais antigo de cada par
    this.schema.raw(`
      DELETE FROM followers f
      USING followers d
      WHERE f.follower_id = d.follower_id
        AND f.following_id = d.following_id
        AND (f.created_at, f.id) > (d.created_at, d.id)
    `)

    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['follower_id', 'following_id'], {
        indexName: 'uq_followers_follower_id_following_id',
      })

      table.check('follower_id <> following_id', [], 'chk_followers_not_self')

      table.dropIndex(['follower_id'], 'idx_followers_follower_id')
      table.dropIndex(['following_id'], 'idx_followers_following_id')

      // "quem eu sigo" e "meus seguidores", ordenados por (created_at, id) DESC
      table.index(['follower_id', 'created_at', 'id'], 'idx_followers_follower_id_created_at_id')
      table.index(['following_id', 'created_at', 'id'], 'idx_followers_following_id_created_at_id')
    })

    this.schema.raw(`
      UPDATE users u SET
        followers_count = (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.id),
        following_count = (SELECT COUNT(*) FROM followers f WHERE f.follower_id = u.id)
    `)
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(
        ['following_id', 'created_at', 'id'],
        'idx_followers_following_id_created_at_id'
      )
      table.dropIndex(
        ['follower_id', 'created_at', 'id'],
        'idx_followers_follower_id_created_at_id'
      )

      table.index(['follower_id'], 'idx_followers_follower_id')
      table.index(['following_id'], 'idx_followers_following_id')

      table.dropChecks(['chk_followers_not_self'])
      table.dropUnique(['follower_id', 'following_id'], 'uq_followers_follower_id_following_id')
    })
  }
}
