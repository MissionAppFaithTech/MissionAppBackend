import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'post_images'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.comment(
        'Imagens associadas a postagens. Permite múltiplas imagens por post com ordem de exibição controlada. Separada de posts para suportar galeria sem alterar a estrutura principal da postagem.'
      )
      table.uuid('id').primary().comment('Identificador único UUID v7')

      // FK: RESTRICT — impede remoção do asset enquanto estiver referenciado por uma imagem de post
      table
        .uuid('image_asset_id')
        .notNullable()
        .comment('Referência ao arquivo de imagem em media_assets')
      table
        .integer('order')
        .notNullable()
        .defaultTo(0)
        .comment('Posição da imagem na galeria da postagem (0 = primeira); único por post')
      table
        .timestamp('created_at', { precision: 3, useTz: true })
        .notNullable()
        .comment('Data de criação do registro')

      // FK: CASCADE — imagens são excluídas junto com o post
      table.uuid('post_id').notNullable().comment('Postagem à qual a imagem pertence')

      table
        .foreign('image_asset_id', 'fk_post_images_image_asset_id')
        .references('id')
        .inTable('media_assets')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')

      table
        .foreign('post_id', 'fk_post_images_post_id')
        .references('id')
        .inTable('posts')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // deferred: permite reordenar imagens na mesma transação sem violar unicidade temporariamente
      table.unique(['post_id', 'order'], {
        indexName: 'uq_post_images_post_id_order',
        deferrable: 'deferred',
      })

      table.check('?? >= 0', ['order'], 'chk_post_images_order_non_negative')

      // listagem de imagens de uma postagem ordenadas por position
      table.index(['post_id'], 'idx_post_images_post_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
