import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'followers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Relacionamento de seguimento entre usuários. Apoiadores seguem missionários; missionários podem seguir outros missionários. Apoiadores não seguem outros apoiadores.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      // FK: CASCADE — relacionamento excluído quando qualquer lado é removido
      table.uuid('follower_id').notNullable().comment('Usuário que está seguindo')
      // FK: CASCADE — relacionamento excluído quando qualquer lado é removido
      table.uuid('following_id').notNullable().comment('Usuário que está sendo seguido')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data em que o relacionamento de seguimento foi criado')

      table
        .foreign('follower_id', 'fk_followers_follower_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('following_id', 'fk_followers_following_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // listagem de "quem eu sigo" e "meus seguidores"
      table.index(['follower_id'], 'idx_followers_follower_id')
      table.index(['following_id'], 'idx_followers_following_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
