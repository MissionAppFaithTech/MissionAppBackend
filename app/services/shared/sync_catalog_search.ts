import { CATALOG_INDEXING_JOB_NAME } from '#constants/catalog_search'
import type { CatalogSearchKind } from '#constants/catalog_search'
import { searchIndexingQueue } from '#queues/search_indexing_queue'
import { CatalogSearchService } from '#services/search/catalog_search_service'
import logger from '@adonisjs/core/services/logger'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type CatalogRow = Parameters<CatalogSearchService['upsert']>[0]

/**
 * Leva a alteração de um item de catálogo ao Elasticsearch **depois do
 * commit** da transação (ADR-0042): o item criado pelo "+ Adicionar" já
 * aparece na próxima busca, e um rollback nunca chega ao índice. Funciona
 * também com a transação do cadastro de missionário, que cria o item.
 *
 * Se o Elasticsearch falhar, a operação no banco não falha: um job na fila de
 * indexação tenta de novo, lendo o estado atual do item.
 *
 * @param trx Transação em que o item foi gravado ou removido.
 * @param kind Catálogo.
 * @param change O item gravado, ou `{ removedId }` quando foi removido.
 * @example
 * syncCatalogSearchAfterCommit(trx, 'faith_communities', community)
 */
export function syncCatalogSearchAfterCommit(
  trx: TransactionClientContract,
  kind: CatalogSearchKind,
  change: CatalogRow | { removedId: string }
): void {
  const id = 'removedId' in change ? change.removedId : change.id
  trx.after('commit', async () => {
    try {
      const search = new CatalogSearchService(kind)
      if ('removedId' in change) await search.remove(id)
      else await search.upsert(change)
    } catch (error) {
      logger.warn({ err: error, kind, id }, 'catalog search sync failed; queued a retry')
      await searchIndexingQueue
        .add(
          CATALOG_INDEXING_JOB_NAME,
          { kind, id },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
          }
        )
        .catch((queueError) =>
          logger.error({ err: queueError, kind, id }, 'catalog search retry could not be queued')
        )
    }
  })
}
