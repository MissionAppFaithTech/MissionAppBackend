import type FaithCommunity from '#models/faith_community'
import type Missionary from '#models/missionary'
import type MissionaryAgency from '#models/missionary_agency'
import CatalogReferenceTransformer from '#transformers/catalog_reference_transformer'
import MissionaryTransformer from '#transformers/missionary_transformer'
import MissionaryWorkAddressTransformer from '#transformers/missionary_work_address_transformer'

const EMPTY_MISSIONARY_PROFILE = {
  missionary: null,
  workAddress: null,
  missionaryAgency: null,
  faithCommunity: null,
}

function catalogReference(item: MissionaryAgency | FaithCommunity | null | undefined) {
  return item ? CatalogReferenceTransformer.transform(item) : null
}

/**
 * Perfil missionário serializado, com o local de atuação e as referências de
 * catálogo (id + nome). Espera `workAddresses`, `agency` e `faithCommunity`
 * carregados.
 *
 * @param missionary Perfil missionário, ou `null` para quem ainda não tem um.
 */
export function missionaryProfilePayload(missionary: Missionary | null) {
  if (!missionary) return EMPTY_MISSIONARY_PROFILE

  const { workAddresses } = missionary
  return {
    missionary: MissionaryTransformer.transform(missionary),
    workAddress: workAddresses ? MissionaryWorkAddressTransformer.transform(workAddresses) : null,
    missionaryAgency: catalogReference(missionary.agency),
    faithCommunity: catalogReference(missionary.faithCommunity),
  }
}
