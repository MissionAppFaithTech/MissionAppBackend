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
 * @param userFaithCommunity Comunidade de fé vinculada à conta do usuário, usada quando `missionary` é nulo ou não tem vínculo próprio.
 * @returns Objeto com `missionary`, `workAddress`, `missionaryAgency` e `faithCommunity` serializados.
 * @example
 * missionaryProfilePayload(missionary, user.faithCommunity)
 */
export function missionaryProfilePayload(
  missionary: Missionary | null,
  userFaithCommunity?: FaithCommunity | null
) {
  if (!missionary) {
    return {
      ...EMPTY_MISSIONARY_PROFILE,
      faithCommunity: catalogReference(userFaithCommunity),
    }
  }

  const { workAddresses } = missionary
  return {
    missionary: MissionaryTransformer.transform(missionary),
    workAddress: workAddresses ? MissionaryWorkAddressTransformer.transform(workAddresses) : null,
    missionaryAgency: catalogReference(missionary.agency),
    faithCommunity: catalogReference(missionary.faithCommunity ?? userFaithCommunity),
  }
}
