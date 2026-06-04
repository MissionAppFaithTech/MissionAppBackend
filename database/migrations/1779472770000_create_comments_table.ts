import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  // tabela criada com arquitetura preparada para feature futura de comentários
  protected tableName = 'comments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Comentários em postagens. Tabela criada para preparar a arquitetura para feature futura; sem suporte a aninhamento na fase inicial. Não exposta pela API até habilitação.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .text('content')
        .notNullable()
        .comment('Texto do comentário; sem suporte a aninhamento ou estilizações na fase inicial')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do comentário')
      table
        .timestamp('updated_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data da última edição do comentário')

      // FK: CASCADE — comentários são excluídos junto com o usuário autor
      table.uuid('user_id').notNullable().comment('Usuário autor do comentário')
      // FK: CASCADE — comentários são excluídos junto com a postagem
      table.uuid('post_id').notNullable().comment('Postagem à qual o comentário pertence')

      table
        .foreign('user_id', 'fk_comments_user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table
        .foreign('post_id', 'fk_comments_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // listagem de comentários de um usuário; listagem de comentários de uma postagem
      table.index(['user_id'], 'idx_comments_user_id')
      table.index(['post_id'], 'idx_comments_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
