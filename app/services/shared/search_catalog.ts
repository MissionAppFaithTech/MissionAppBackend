import { CATALOG_FUZZY_MIN_LENGTH, CATALOG_SEARCH_DEFAULT_LIMIT } from '#constants/catalog'
import type { CatalogSearchKind } from '#constants/catalog_search'
import { CatalogSearchService } from '#services/search/catalog_search_service'
import { applySearchFilters, paginateCatalog } from '#services/shared/apply_search_filters'
import type { CatalogPage, SearchFilters } from '#services/shared/apply_search_filters'
import { normalizeCatalogKey } from '#services/shared/find_catalog_duplicate'
import logger from '@adonisjs/core/services/logger'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type Query<Model extends LucidModel> = ModelQueryBuilderContract<Model, InstanceType<Model>>

/**
 * Busca de um catálogo (ADR-0042):
 * - termo com 3+ caracteres: Elasticsearch, tolerante a erros; ele devolve os
 *   IDs em ordem de relevância e os registros vêm do PostgreSQL (fonte de
 *   verdade — um ID que não existe mais é descartado);
 * - termo curto ou sem termo: PostgreSQL (prefixo / primeira página);
 * - Elasticsearch fora do ar ou sem índice: a mesma busca tolerante a erros
 *   no PostgreSQL ({@link applySearchFilters}), mais lenta em catálogos grandes.
 *
 * @param kind Catálogo no Elasticsearch.
 * @param model Model do catálogo.
 * @param filters Termo, localidade e limite.
 * @param scope Ajusta a query do banco (ex.: `preload`).
 * @returns Uma página com `hasMore`.
 */
export async function searchCatalog<Model extends LucidModel & { query(): Query<Model> }>(
  kind: CatalogSearchKind,
  model: Model,
  filters: SearchFilters,
  scope: (query: Query<Model>) => Query<Model> = (query) => query
): Promise<CatalogPage<InstanceType<Model>>> {
  const limit = filters.limit ?? CATALOG_SEARCH_DEFAULT_LIMIT
  if (filters.search && normalizeCatalogKey(filters.search).length >= CATALOG_FUZZY_MIN_LENGTH) {
    try {
      const ids = await new CatalogSearchService(kind).searchIds(filters.search, filters, limit + 1)
      return {
        items: await loadInOrder(model, ids.slice(0, limit), scope),
        hasMore: ids.length > limit,
      }
    } catch (error) {
      logger.warn({ err: error, kind }, 'catalog search on Elasticsearch failed; using PostgreSQL')
    }
  }
  return paginateCatalog(scope(applySearchFilters(model.query(), filters)), limit)
}

async function loadInOrder<Model extends LucidModel & { query(): Query<Model> }>(
  model: Model,
  ids: string[],
  scope: (query: Query<Model>) => Query<Model>
): Promise<InstanceType<Model>[]> {
  if (ids.length === 0) return []
  const rows = (await scope(model.query().whereIn('id', ids))) as InstanceType<Model>[]
  const byId = new Map(rows.map((row) => [(row as { id: string }).id, row]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
}
