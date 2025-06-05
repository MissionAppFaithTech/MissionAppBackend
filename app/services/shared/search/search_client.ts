import app from '@adonisjs/core/services/app'
import { ElasticsearchClient } from '#services/shared/search/elasticsearch_client'

let searchClient: ElasticsearchClient

/**
 * Instância singleton de `ElasticsearchClient`, resolvida do container após
 * o boot da aplicação — mesmo padrão usado por `#services/shared/cache/cache.ts`.
 * Passa pelo container (em vez de `new ElasticsearchClient(...)` direto
 * aqui) por causa do `ElasticsearchProvider`: permite
 * `container.swap(ElasticsearchClient, fake)` em testes no futuro.
 */
await app.booted(async () => {
  searchClient = await app.container.make(ElasticsearchClient)
})

export { searchClient as default }
