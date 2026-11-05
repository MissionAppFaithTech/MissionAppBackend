import { CATALOG_SEARCH_KINDS } from '#constants/catalog_search'
import { CatalogSearchService, catalogAlias } from '#services/search/catalog_search_service'
import searchClient from '#services/shared/search/search_client'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Recria os índices de busca dos catálogos a partir do PostgreSQL (ADR-0042),
 * trocando o alias de uma vez para a busca nunca ficar vazia. Rodar no deploy
 * (antes da primeira busca) e depois de mudar o mapping; sem o índice a busca
 * usa o PostgreSQL.
 */
export default class SearchReindexCatalogs extends BaseCommand {
  static commandName = 'search:reindex-catalogs'
  static description =
    'Recria os índices de busca de agências missionárias e comunidades de fé no Elasticsearch'

  static options: CommandOptions = { startApp: true }

  async run() {
    try {
      for (const kind of CATALOG_SEARCH_KINDS) {
        const total = await new CatalogSearchService(kind).rebuild()
        this.logger.success(`${catalogAlias(kind)}: ${total} item(ns) indexado(s)`)
      }
    } catch (error) {
      this.exitCode = 1
      this.logger.error(`falha ao reindexar os catálogos: ${(error as Error).message}`)
    } finally {
      await searchClient.close()
    }
  }
}
