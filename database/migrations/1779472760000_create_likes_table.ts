import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'likes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Curtidas em postagens. Qualquer usuário autenticado pode curtir; unique constraint impede like duplicado. Contagem usada para engajamento no feed.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data em que o like foi registrado')

      // FK: CASCADE — like é removido se o usuário ou a postagem for excluída
      table.uuid('user_id').notNullable().comment('Usuário que curtiu a postagem')
      // FK: CASCADE — like é removido se o usuário ou a postagem for excluída
      table.uuid('post_id').notNullable().comment('Postagem curtida')

      table
        .foreign('user_id', 'fk_likes_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('post_id', 'fk_likes_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // impede que o mesmo usuário curta a mesma postagem mais de uma vez
      table.unique(['user_id', 'post_id'], { indexName: 'uq_likes_user_id_post_id' })

      // likes dados por um usuário; likes recebidos por uma postagem
      table.index(['user_id'], 'idx_likes_user_id')
      table.index(['post_id'], 'idx_likes_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
