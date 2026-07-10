import { MISSIONARY_SEARCH_INDEX } from '#constants/missionary_search'
import searchClient from '#services/shared/search/search_client'

export type MissionaryDocument = {
  fullName: string
  email: string
}

/**
 * Índice e busca de missionários no Elasticsearch, por nome — consumido pela
 * indexação assíncrona (`app/jobs/user/index_missionary_job.ts`, disparada
 * via evento `UserRegistered`) e, futuramente, por um endpoint de busca.
 */
export class MissionarySearchService {
  async #ensureIndex(): Promise<void> {
    await searchClient.ensureIndex(MISSIONARY_SEARCH_INDEX, {
      properties: {
        // `keyword` aninhado permite ordenar/agregar por nome exato além da
        // busca full-text — mesmo campo, dois usos.
        fullName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        email: { type: 'keyword' },
      },
    })
  }

  /**
   * Indexa (ou reindexa) um missionário.
   *
   * @param userId ID do usuário — usado como `_id` do documento; reindexar o
   *               mesmo usuário substitui o documento anterior por completo.
   * @param document Dados buscáveis do missionário.
   * @returns Nada.
   * @example
   * await service.index(user.id, { fullName: user.fullName, email: user.email })
   */
  async index(userId: string, document: MissionaryDocument): Promise<void> {
    await this.#ensureIndex()
    await searchClient.index(MISSIONARY_SEARCH_INDEX, userId, document)
  }

  /**
   * Busca missionários pelo nome — full-text, tolera erro de digitação
   * (`fuzziness: 'AUTO'`) e palavra parcial.
   *
   * @param query Termo de busca.
   * @returns Missionários encontrados, em ordem de relevância.
   * @example
   * const results = await service.searchByName('joão')
   */
  async searchByName(query: string): Promise<MissionaryDocument[]> {
    await this.#ensureIndex()
    return searchClient.search<MissionaryDocument>(MISSIONARY_SEARCH_INDEX, {
      match: { fullName: { query, fuzziness: 'AUTO' } },
    })
  }
}
