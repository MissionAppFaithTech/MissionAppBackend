import type { UserRegisteredPayload } from '#types/events/user/user_registered'
import { MissionarySearchService } from '#services/search/missionary_search_service'

/**
 * Indexa um missionário no Elasticsearch — chamado pelo worker ao processar
 * um job da fila, nunca diretamente do request HTTP.
 *
 * @param payload Dados do usuário capturados no momento do cadastro.
 * @returns Nada — efeito colateral (indexação no Elasticsearch).
 * @example
 * await indexMissionary(job.data)
 */
export async function indexMissionary(payload: UserRegisteredPayload): Promise<void> {
  await new MissionarySearchService().index(payload.id, {
    fullName: payload.fullName,
    email: payload.email,
  })
}
