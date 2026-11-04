import type FaithCommunity from '#models/faith_community'
import type MissionaryAgency from '#models/missionary_agency'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Referência enxuta (`id` + `name`) a um item de catálogo vinculado ao
 * missionário. Permite exibir o nome no perfil sem consultar as rotas públicas
 * de catálogo, que têm rate limit por IP.
 */
export default class CatalogReferenceTransformer extends BaseTransformer<
  MissionaryAgency | FaithCommunity
> {
  toObject() {
    return this.pick(this.resource, ['id', 'name'])
  }
}
