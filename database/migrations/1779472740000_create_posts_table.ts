import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Publicações criadas exclusivamente por missionários para comunicar atualizações aos seguidores. Base do feed cronológico da plataforma.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      table
        .text('content')
        .notNullable()
        .comment('Legenda/texto da postagem; preenchimento obrigatório')
      table
        .string('highlight_link')
        .nullable()
        .comment('Link externo opcional exibido em destaque na postagem')
      table
        .string('slug')
        .notNullable()
        .comment(
          'Identificador único legível para URL da postagem; derivado do conteúdo; imutável após criação'
        )
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de publicação; usada para ordenação cronológica do feed')

      // FK: CASCADE — posts são excluídos junto com o missionário; apenas missionários criam posts
      table
        .uuid('missionary_id')
        .notNullable()
        .comment('Missionário autor da postagem; apenas missionários podem postar')

      table
        .foreign('missionary_id', 'fk_posts_missionary_id')
        .references('id')
        .inTable('missionaries')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['slug'], { indexName: 'uq_posts_slug' })

      // feed cronológico de um missionário específico
      table.index(['missionary_id', 'created_at'], 'idx_posts_missionary_id_created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
