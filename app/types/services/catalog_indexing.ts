import type { CatalogSearchKind } from '#constants/catalog_search'

/** Item de catálogo a reindexar pelo worker (`CATALOG_INDEXING_JOB_NAME`). */
export type CatalogIndexingPayload = { kind: CatalogSearchKind; id: string }
