import { elasticsearchConnection } from '#config/elasticsearch'
import { ElasticsearchClient } from '#services/shared/search/elasticsearch_client'
import type { ApplicationService } from '@adonisjs/core/types'
import { Client } from '@elastic/elasticsearch'

/**
 * Registra o singleton de busca (`ElasticsearchClient`) usado pelos services
 * de indexação/busca (ex: `MissionarySearchService`). Ver
 * `app/services/shared/search/elasticsearch_client.ts` para a interface
 * exposta aos consumidores.
 *
 * NOTE: sem hook `shutdown()` de propósito — mesmo motivo do
 * `CacheProvider` (`providers/cache_provider.ts`): o boot interno do
 * `node ace test` reinicia o ciclo de vida da aplicação dentro do mesmo
 * processo antes dos testes reais rodarem; um `shutdown()` aqui fecharia a
 * conexão permanentemente nesse ponto intermediário. Fechamento explícito
 * nos testes fica em `tests/bootstrap.ts`, no teardown real do Japa.
 */
export default class ElasticsearchProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registra o binding singleton de `ElasticsearchClient` no container.
   */
  register() {
    this.app.container.singleton(
      ElasticsearchClient,
      () => new ElasticsearchClient(new Client(elasticsearchConnection))
    )
  }
}
