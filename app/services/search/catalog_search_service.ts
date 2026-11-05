import { CATALOG_REINDEX_BATCH_SIZE } from '#constants/catalog_search'
import type { CatalogSearchKind } from '#constants/catalog_search'
import FaithCommunity from '#models/faith_community'
import MissionaryAgency from '#models/missionary_agency'
import { normalizeCatalogKey } from '#services/shared/find_catalog_duplicate'
import { searchWords } from '#services/shared/apply_search_filters'
import type { SearchFilters } from '#services/shared/apply_search_filters'
import searchClient from '#services/shared/search/search_client'
import env from '#start/env'
import type { estypes as ES } from '@elastic/elasticsearch'

/** Campos de um item de catálogo que a busca usa. */
export type CatalogSearchDocument = {
  name: string
  city: string | null
  state: string | null
  country: string | null
}

type CatalogRow = { id: string } & CatalogSearchDocument

const MODELS = {
  missionary_agencies: MissionaryAgency,
  faith_communities: FaithCommunity,
} as const

/**
 * Análise dos índices de catálogo: sem acentos e sem maiúsculas
 * (`asciifolding` + `lowercase`), como `catalog_normalize` no banco.
 * `catalog_prefix` indexa os começos de cada palavra (edge n-grams), para o
 * autocomplete achar "jove" em "Jovens".
 */
export const CATALOG_INDEX_SETTINGS: ES.IndicesIndexSettings = {
  number_of_shards: 1,
  // NOTE: 0 réplicas num nó só (desenvolvimento), 1 quando houver mais nós
  auto_expand_replicas: '0-1',
  analysis: {
    filter: { catalog_edge: { type: 'edge_ngram', min_gram: 2, max_gram: 20 } },
    analyzer: {
      catalog_text: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding'],
      },
      catalog_prefix: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'catalog_edge'],
      },
    },
    normalizer: { catalog_sort: { type: 'custom', filter: ['lowercase', 'asciifolding'] } },
  },
}

/**
 * `name` é buscado (texto, aproximado), começado (`name.prefix`) e ordenado
 * (`name.sort`); a localidade só filtra. `strict`: nenhum campo entra sem
 * estar aqui.
 */
export const CATALOG_INDEX_MAPPINGS: ES.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    name: {
      type: 'text',
      analyzer: 'catalog_text',
      fields: {
        prefix: { type: 'text', analyzer: 'catalog_prefix', search_analyzer: 'catalog_text' },
        sort: { type: 'keyword', normalizer: 'catalog_sort', ignore_above: 256 },
      },
    },
    city: { type: 'text', analyzer: 'catalog_text' },
    state: { type: 'text', analyzer: 'catalog_text' },
    country: { type: 'text', analyzer: 'catalog_text' },
  },
}

/** Alias do catálogo, com o prefixo do ambiente (`ELASTIC_INDEX_PREFIX`). */
export function catalogAlias(kind: CatalogSearchKind): string {
  return `${env.get('ELASTIC_INDEX_PREFIX') ?? ''}catalog_${kind}`
}

/**
 * Corpo da busca tolerante a erros (ADR-0042):
 * - cada palavra digitada (até 5) é obrigatória, em qualquer ordem: casa com
 *   até 1–2 letras erradas (`fuzziness: AUTO`, inversões contam 1) ou como
 *   começo de uma palavra do nome (`name.prefix`);
 * - pontua mais quem começa com o termo, depois quem tem a frase, depois quem
 *   tem as palavras exatas; desempate por nome e id.
 *
 * @example
 * catalogSearchRequest('jocun brasil', {}, 11)
 */
export function catalogSearchRequest(
  search: string,
  filters: Pick<SearchFilters, 'city' | 'state' | 'country'>,
  size: number
): Omit<ES.SearchRequest, 'index'> {
  const term = normalizeCatalogKey(search)
  const words = searchWords(term)
  const wordClauses: ES.QueryDslQueryContainer[] = words.map((word) =>
    word.length < 3
      ? { match: { 'name.prefix': word } }
      : {
          bool: {
            should: [
              { match: { name: { query: word, fuzziness: 'AUTO' } } },
              { match: { 'name.prefix': word } },
            ],
            minimum_should_match: 1,
          },
        }
  )
  const locationFilters = (['city', 'state', 'country'] as const).flatMap((field) =>
    filters[field]
      ? [{ match: { [field]: { query: filters[field], operator: 'and' as const } } }]
      : []
  )

  return {
    size,
    query: {
      bool: {
        must: wordClauses.length > 0 ? wordClauses : [{ match: { name: term } }],
        should: [
          { prefix: { 'name.sort': { value: term, boost: 8 } } },
          { match_phrase: { name: { query: term, boost: 4 } } },
          { match: { name: { query: term, operator: 'and', boost: 2 } } },
        ],
        filter: locationFilters,
      },
    },
    sort: ['_score', { 'name.sort': 'asc' }],
  }
}

/**
 * Índice de busca de um catálogo no Elasticsearch. O PostgreSQL continua a
 * fonte de verdade: o índice guarda só o que a busca usa e a resposta devolve
 * IDs, que quem chama carrega do banco.
 */
export class CatalogSearchService {
  constructor(private readonly kind: CatalogSearchKind) {}

  /** IDs que casam com o termo, na ordem de relevância. */
  async searchIds(search: string, filters: SearchFilters, size: number): Promise<string[]> {
    return searchClient.searchIds(
      catalogAlias(this.kind),
      catalogSearchRequest(search, filters, size)
    )
  }

  /**
   * Indexa (ou substitui) um item. Sem o índice criado (antes da primeira
   * reconstrução) não faz nada: a reconstrução lê tudo do banco.
   */
  async upsert(row: CatalogRow): Promise<void> {
    await searchClient.indexIntoAlias(catalogAlias(this.kind), row.id, documentOf(row))
  }

  async remove(id: string): Promise<void> {
    await searchClient.remove(catalogAlias(this.kind), id)
  }

  /** Recria o índice a partir do banco, sem deixar a busca vazia na troca. */
  async rebuild(): Promise<number> {
    return searchClient.rebuildAlias(
      catalogAlias(this.kind),
      { settings: CATALOG_INDEX_SETTINGS, mappings: CATALOG_INDEX_MAPPINGS },
      batchesOf(this.kind)
    )
  }
}

function documentOf(row: CatalogRow): CatalogSearchDocument {
  return { name: row.name, city: row.city, state: row.state, country: row.country }
}

async function* batchesOf(kind: CatalogSearchKind) {
  let page = 1
  while (true) {
    const rows = await MODELS[kind]
      .query()
      .select('id', 'name', 'city', 'state', 'country')
      .orderBy('id', 'asc')
      .forPage(page, CATALOG_REINDEX_BATCH_SIZE)
    yield rows.map((row) => ({ id: row.id, document: documentOf(row) }))
    if (rows.length < CATALOG_REINDEX_BATCH_SIZE) return
    page += 1
  }
}
