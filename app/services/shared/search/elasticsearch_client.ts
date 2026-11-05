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
   * Indexa um documento por um **alias**, sem criar o índice: se o alias não
   * existir, devolve `false` em vez de deixar o Elasticsearch criar um índice
   * vazio com mapping dinâmico (quem cria é a reconstrução, ex.:
   * `search:reindex-catalogs`). Espera o refresh, como {@link index}.
   *
   * @param alias Alias de destino.
   * @param id `_id` do documento.
   * @param document Documento a indexar.
   * @returns `false` quando o alias não existe.
   * @example
   * await searchClient.indexIntoAlias('catalog_faith_communities', id, { name })
   */
  async indexIntoAlias<TDocument extends Record<string, unknown>>(
    alias: string,
    id: string,
    document: TDocument
  ): Promise<boolean> {
    try {
      await this.#client.index({
        index: alias,
        id,
        document,
        require_alias: true,
        refresh: 'wait_for',
      })
      return true
    } catch (error) {
      if (isIndexMissing(error)) return false
      throw error
    }
  }

  /**
   * Remove um documento; ausência do documento ou do índice não é erro.
   *
   * @param indexName Índice ou alias.
   * @param id `_id` do documento.
   * @returns Nada.
   * @example
   * await searchClient.remove('catalog_faith_communities', id)
   */
  async remove(indexName: string, id: string): Promise<void> {
    try {
      await this.#client.delete({ index: indexName, id, refresh: 'wait_for' })
    } catch (error) {
      if (isNotFound(error)) return
      throw error
    }
  }

  /**
   * Busca e devolve só os `_id` dos hits, na ordem do Elasticsearch — quem
   * chama carrega os registros da fonte de verdade (PostgreSQL).
   *
   * @param indexName Índice ou alias.
   * @param request Corpo da busca (query, sort, size).
   * @returns IDs na ordem de relevância.
   * @example
   * const ids = await searchClient.searchIds('catalog_faith_communities', { query, size: 11 })
   */
  async searchIds(indexName: string, request: Omit<ES.SearchRequest, 'index'>): Promise<string[]> {
    const response = await this.#client.search({ ...request, index: indexName, _source: false })
    return response.hits.hits.flatMap((hit) => (hit._id ? [hit._id] : []))
  }

  /**
   * Recria um índice atrás de um alias sem deixar a busca vazia: cria um
   * índice novo (`<alias>_<timestamp>`), carrega os documentos em lotes, troca
   * o alias de uma vez (operação atômica) e apaga os índices antigos.
   *
   * @param alias Alias lido e escrito pela aplicação.
   * @param body `settings` e `mappings` do índice novo.
   * @param batches Lotes de `{ id, document }` a carregar.
   * @returns Quantos documentos foram carregados.
   * @example
   * await searchClient.rebuildAlias('catalog_faith_communities', { settings, mappings }, batches)
   */
  async rebuildAlias(
    alias: string,
    body: { settings: ES.IndicesIndexSettings; mappings: ES.MappingTypeMapping },
    batches: AsyncIterable<{ id: string; document: Record<string, unknown> }[]>
  ): Promise<number> {
    const indexName = `${alias}_${Date.now()}`
    await this.#client.indices.create({ index: indexName, ...body })

    let total = 0
    for await (const batch of batches) {
      if (batch.length === 0) continue
      const response = await this.#client.bulk({
        operations: batch.flatMap(({ id, document }) => [
          { index: { _index: indexName, _id: id } },
          document,
        ]),
      })
      if (response.errors) {
        await this.#client.indices.delete({ index: indexName })
        throw new Error(`falha ao carregar documentos em ${indexName}`)
      }
      total += batch.length
    }
    await this.#client.indices.refresh({ index: indexName })

    const previous = await this.#indicesOf(alias)
    await this.#client.indices.updateAliases({
      actions: [
        ...previous.map((index) => ({ remove: { index, alias } })),
        { add: { index: indexName, alias } },
      ],
    })
    if (previous.length > 0) await this.#client.indices.delete({ index: previous })
    return total
  }

  async #indicesOf(alias: string): Promise<string[]> {
    try {
      return Object.keys(await this.#client.indices.getAlias({ name: alias }))
    } catch (error) {
      if (isNotFound(error)) return []
      throw error
    }
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

type EsError = { meta?: { statusCode?: number; body?: { error?: { type?: string } } } }

function isNotFound(error: unknown): boolean {
  return (error as EsError)?.meta?.statusCode === 404
}

/** `index_not_found_exception` (ex.: `require_alias` sem o alias). */
function isIndexMissing(error: unknown): boolean {
  return (error as EsError)?.meta?.body?.error?.type === 'index_not_found_exception'
}
