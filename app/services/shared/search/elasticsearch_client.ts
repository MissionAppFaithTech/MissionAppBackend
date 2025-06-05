import type { Client, estypes as ES } from '@elastic/elasticsearch'

/**
 * Client de busca genérico — hoje apoiado em Elasticsearch, mas a interface
 * expõe só as operações que a aplicação realmente usa (garantir índice,
 * indexar, buscar, fechar conexão). Uma troca futura de backend só exige
 * mudar a implementação interna desta classe e do provider que a registra
 * (`providers/elasticsearch_provider.ts`) — nenhum consumidor referencia
 * `@elastic/elasticsearch` diretamente.
 */
export class ElasticsearchClient {
  #client: Client
  #ensuredIndexes = new Set<string>()

  constructor(client: Client) {
    this.#client = client
  }

  /**
   * Garante que um índice existe, criando com o mapping informado se ainda
   * não existir. Idempotente e memoizado em processo — a checagem de
   * existência só bate no Elasticsearch uma vez por índice por processo,
   * não a cada chamada de `index()`.
   *
   * @param indexName Nome do índice.
   * @param mappings Mapping de campos do índice, aplicado só na criação.
   * @returns Nada.
   * @example
   * await searchClient.ensureIndex('missionaries', { properties: { fullName: { type: 'text' } } })
   */
  async ensureIndex(indexName: string, mappings: ES.MappingTypeMapping): Promise<void> {
    if (this.#ensuredIndexes.has(indexName)) return

    const exists = await this.#client.indices.exists({ index: indexName })
    if (!exists) {
      await this.#client.indices.create({ index: indexName, mappings })
    }

    this.#ensuredIndexes.add(indexName)
  }

  /**
   * Indexa (cria ou substitui) um documento. Usa `refresh: 'wait_for'` — o
   * volume de indexação da aplicação é baixo (cadastro de usuário, não
   * ingestão em massa), então o custo de esperar o refresh compensa não ter
   * que lidar com o atraso "near real-time" padrão do Elasticsearch (~1s) em
   * quem chama.
   *
   * @param indexName Índice de destino.
   * @param id Identificador do documento — reindexar o mesmo `id` substitui o documento anterior.
   * @param document Documento a indexar.
   * @returns Nada.
   * @example
   * await searchClient.index('missionaries', user.id, { fullName: user.fullName })
   */
  async index<TDocument extends Record<string, unknown>>(
    indexName: string,
    id: string,
    document: TDocument
  ): Promise<void> {
    await this.#client.index({ index: indexName, id, document, refresh: 'wait_for' })
  }

  /**
   * Busca documentos por uma query DSL do Elasticsearch, devolvendo só os
   * `_source` dos hits — quem chama não precisa lidar com o envelope de
   * resposta do Elasticsearch (`hits.hits[]._source`, scores, etc).
   *
   * @param indexName Índice a consultar.
   * @param query Query DSL do Elasticsearch.
   * @returns Lista de documentos encontrados, na ordem de relevância.
   * @example
   * const results = await searchClient.search('missionaries', { match: { fullName: 'joão' } })
   */
  async search<TDocument extends Record<string, unknown>>(
    indexName: string,
    query: ES.QueryDslQueryContainer
  ): Promise<TDocument[]> {
    const response = await this.#client.search<TDocument>({ index: indexName, query })
    return response.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []))
  }

  /**
   * Fecha a conexão subjacente.
   *
   * @returns Nada.
   * @example
   * await searchClient.close()
   */
  async close(): Promise<void> {
    await this.#client.close()
  }
}
