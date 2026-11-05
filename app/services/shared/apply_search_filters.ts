import {
  CATALOG_FUZZY_MIN_SIMILARITY,
  CATALOG_SEARCH_DEFAULT_LIMIT,
  CATALOG_SEARCH_MAX_WORDS,
  catalogMaxEdits,
} from '#constants/catalog'
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

// NOTE: com menos de 3 caracteres o pg_trgm não gera trigramas; nesses termos a
// busca é por prefixo, servida pelo B-tree text_pattern_ops
const CONTAINS_MIN_LENGTH = 3

/**
 * Aplica a busca normalizada (sem acento, sem distinção de maiúsculas) por nome
 * e os filtros de localidade a uma query de catálogo com as colunas
 * `name_normalized`/`city_normalized` (ADR-0041). O termo é normalizado no
 * banco por `catalog_normalize`, a mesma função da deduplicação.
 *
 * - 2 caracteres: começa com o termo (B-tree `text_pattern_ops`);
 * - 3+: tolerante a erros (ADR-0042) — cada palavra digitada precisa casar
 *   com o nome, em qualquer ordem (ver {@link wordMatchSql}). Vêm primeiro
 *   quem começa com o termo, depois quem o contém inteiro, depois os mais
 *   parecidos.
 *
 * Ordena por nome no desempate; o limite fica com {@link paginateCatalog}.
 */
export function applySearchFilters<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  filters: SearchFilters
): ModelQueryBuilderContract<Model> {
  if (filters.search) applyNameSearch(query, filters.search)
  applyLocationFilters(query, filters)
  return query.orderBy('name_normalized', 'asc').orderBy('id', 'asc')
}

/**
 * Palavras do termo já normalizado, sem pontuação e sem repetição, até
 * {@link CATALOG_SEARCH_MAX_WORDS}.
 *
 * @example
 * searchWords('jocum (jovens) jocum') // ['jocum', 'jovens']
 */
export function searchWords(normalized: string): string[] {
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  return [...new Set(words)].slice(0, CATALOG_SEARCH_MAX_WORDS)
}

// NOTE: palavras do nome para o Levenshtein; separa também a pontuação, para
// que "(jovens" conte como "jovens"
const NAME_WORDS_SQL = `regexp_split_to_table(name_normalized, '[^[:alnum:]]+')`

/**
 * Condição de uma palavra digitada casar com o nome:
 * - 1–2 letras: o nome a contém (trigrama e Levenshtein não ajudam);
 * - 3+: o nome a contém, OU lembra uma palavra do nome (`word_similarity` ≥
 *   {@link CATALOG_FUZZY_MIN_SIMILARITY}: letras faltando ou trocadas), OU uma
 *   palavra do nome está a até {@link catalogMaxEdits} edições (inversões).
 */
function wordMatchSql(word: string): { sql: string; bindings: (string | number)[] } {
  const contains = `name_normalized LIKE '%' || catalog_normalize(?) || '%'`
  const edits = catalogMaxEdits(word.length)
  if (edits === 0) return { sql: contains, bindings: [escapeLike(word)] }
  return {
    sql: `(${contains}
      OR word_similarity(catalog_normalize(?), name_normalized) >= ?
      OR EXISTS (SELECT 1 FROM ${NAME_WORDS_SQL} AS name_word(value)
        WHERE levenshtein_less_equal(catalog_normalize(?), name_word.value, ?) <= ?))`,
    bindings: [escapeLike(word), word, CATALOG_FUZZY_MIN_SIMILARITY, word, edits, edits],
  }
}

function applyNameSearch<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  search: string
): void {
  const term = escapeLike(search)
  const normalized = normalizeCatalogKey(search)
  if (normalized.length < CONTAINS_MIN_LENGTH) {
    query.whereRaw(`name_normalized LIKE catalog_normalize(?) || '%'`, [term])
    return
  }

  const words = searchWords(normalized)
  // NOTE: termo só de pontuação ("!!!") não tem palavras: busca o trecho literal
  if (words.length === 0) {
    query.whereRaw(`name_normalized LIKE '%' || catalog_normalize(?) || '%'`, [term])
  }
  for (const word of words) {
    const match = wordMatchSql(word)
    query.whereRaw(match.sql, match.bindings)
  }

  query
    .orderByRaw(`(name_normalized LIKE catalog_normalize(?) || '%') DESC`, [term])
    .orderByRaw(`(name_normalized LIKE '%' || catalog_normalize(?) || '%') DESC`, [term])
  if (words.length > 0) {
    query.orderByRaw(
      `(${words.map(() => 'word_similarity(catalog_normalize(?), name_normalized)').join(' + ')}) DESC`,
      words
    )
  }
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
