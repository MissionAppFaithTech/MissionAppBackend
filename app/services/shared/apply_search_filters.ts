import { CATALOG_SEARCH_DEFAULT_LIMIT } from '#constants/catalog'
import { escapeLike } from '#utils/escape_like'
import { normalizeCatalogKey } from '#services/shared/find_catalog_duplicate'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export type SearchFilters = {
  search?: string
  city?: string
  state?: string
  country?: string
  limit?: number
}

/** Página de uma busca de catálogo: os itens e se há mais além do limite. */
export type CatalogPage<Item> = { items: Item[]; hasMore: boolean }

// NOTE: com menos de 3 caracteres o pg_trgm não gera trigramas e o GIN não
// ajuda; nesses termos a busca é por prefixo, servida pelo B-tree text_pattern_ops
const CONTAINS_MIN_LENGTH = 3

/**
 * Aplica a busca normalizada (sem acento, sem distinção de maiúsculas) por nome
 * e os filtros de localidade a uma query de catálogo com as colunas
 * `name_normalized`/`city_normalized` (ADR-0041). O termo é normalizado no
 * banco por `catalog_normalize`, a mesma função da deduplicação.
 *
 * - 2 caracteres: começa com o termo (B-tree `text_pattern_ops`);
 * - 3+: contém o termo (GIN `gin_trgm_ops`), com quem começa com ele primeiro.
 *
 * Ordena por nome; o limite fica com {@link paginateCatalog}.
 */
export function applySearchFilters<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  filters: SearchFilters
): ModelQueryBuilderContract<Model> {
  if (filters.search) applyNameSearch(query, filters.search)
  applyLocationFilters(query, filters)
  return query.orderBy('name_normalized', 'asc').orderBy('id', 'asc')
}

function applyNameSearch<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  search: string
): void {
  const term = escapeLike(search)
  if (normalizeCatalogKey(search).length < CONTAINS_MIN_LENGTH) {
    query.whereRaw(`name_normalized LIKE catalog_normalize(?) || '%'`, [term])
    return
  }
  query
    .whereRaw(`name_normalized LIKE '%' || catalog_normalize(?) || '%'`, [term])
    .orderByRaw(`(name_normalized LIKE catalog_normalize(?) || '%') DESC`, [term])
}

function applyLocationFilters<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  filters: SearchFilters
): void {
  if (filters.city) {
    query.whereRaw(`city_normalized LIKE '%' || catalog_normalize(?) || '%'`, [
      escapeLike(filters.city),
    ])
  }
  for (const column of ['state', 'country'] as const) {
    const value = filters[column]
    if (value) query.whereILike(column, `%${escapeLike(value)}%`)
  }
}

/**
 * Executa a busca com limite (padrão {@link CATALOG_SEARCH_DEFAULT_LIMIT}, máximo
 * do validator) e lê um item a mais para saber se há outros. Nunca retorna a
 * tabela inteira.
 */
export async function paginateCatalog<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  limit = CATALOG_SEARCH_DEFAULT_LIMIT
): Promise<CatalogPage<InstanceType<Model>>> {
  const rows = (await query.limit(limit + 1)) as InstanceType<Model>[]
  return { items: rows.slice(0, limit), hasMore: rows.length > limit }
}
