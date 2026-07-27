import { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import type MissionaryProfileCreated from '#events/missionary/missionary_profile_created'
import { searchIndexingQueue } from '#queues/search_indexing_queue'

export default class IndexMissionaryOnProfileCreatedListener {
  async handle(event: MissionaryProfileCreated): Promise<void> {
    await searchIndexingQueue.add(MISSIONARY_INDEXING_JOB_NAME, { ...event })
  }
}
