import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // impede que o mesmo usuário siga o mesmo alvo mais de uma vez
      table.unique(['follower_id', 'following_id'], {
        indexName: 'uq_followers_follower_id_following_id',
      })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['follower_id', 'following_id'], 'uq_followers_follower_id_following_id')
    })
  }
}
