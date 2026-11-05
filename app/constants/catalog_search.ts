/**
 * Busca de catálogos no Elasticsearch (ADR-0042).
 */

/** Catálogos indexados; o valor é também o sufixo do alias no Elasticsearch. */
export const CATALOG_SEARCH_KINDS = ['missionary_agencies', 'faith_communities'] as const

export type CatalogSearchKind = (typeof CATALOG_SEARCH_KINDS)[number]

/** Job da fila `SEARCH_INDEXING_QUEUE_NAME` que reindexa um item quando a escrita na hora falhou. */
export const CATALOG_INDEXING_JOB_NAME = 'index-catalog-item'

/** Itens lidos do PostgreSQL por lote na reconstrução dos índices. */
export const CATALOG_REINDEX_BATCH_SIZE = 500
