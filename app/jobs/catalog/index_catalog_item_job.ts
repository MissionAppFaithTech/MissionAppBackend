import FaithCommunity from '#models/faith_community'
import MissionaryAgency from '#models/missionary_agency'
import { CatalogSearchService } from '#services/search/catalog_search_service'
import type { CatalogIndexingPayload } from '#types/services/catalog_indexing'

/**
 * Reindexa um item de catálogo a partir do banco — reserva para quando a
 * escrita no Elasticsearch logo após o commit falhou (ADR-0042). Lê o estado
 * atual: o item ainda existe → indexa; não existe mais → remove do índice.
 *
 * @param payload Catálogo e ID do item.
 * @returns Nada.
 * @example
 * await indexCatalogItem({ kind: 'faith_communities', id })
 */
export async function indexCatalogItem({ kind, id }: CatalogIndexingPayload): Promise<void> {
  const model = kind === 'missionary_agencies' ? MissionaryAgency : FaithCommunity
  const row = await model.find(id)
  const search = new CatalogSearchService(kind)
  if (row) await search.upsert(row)
  else await search.remove(id)
}
