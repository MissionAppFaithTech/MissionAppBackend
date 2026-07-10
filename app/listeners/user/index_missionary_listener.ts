import { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import { UserRole } from '#enums/user/user_role'
import type UserRegistered from '#events/user/user_registered'
import { searchIndexingQueue } from '#queues/search_indexing_queue'

/**
 * Enfileira a indexação no Elasticsearch só quando o usuário cadastrado é
 * missionário — apoiadores e admins não entram no índice de busca por nome.
 */
export default class IndexMissionaryListener {
  async handle(event: UserRegistered): Promise<void> {
    if (event.role !== UserRole.MISSIONARY) return

    await searchIndexingQueue.add(MISSIONARY_INDEXING_JOB_NAME, { ...event })
  }
}
