import { indexMissionary } from '#jobs/user/index_missionary_job'
import { MissionarySearchService } from '#services/search/missionary_search_service'
import { UserRole } from '#enums/user/user_role'
import { v7 as uuidv7 } from 'uuid'
import { test } from '@japa/runner'

test.group('indexMissionary (job)', () => {
  test('indexa o missionário no Elasticsearch a partir do payload', async ({ assert }) => {
    const userId = uuidv7()
    const fullName = `Missionário Job ${userId}`

    await indexMissionary({
      id: userId,
      fullName,
      email: `${userId}@example.com`,
      role: UserRole.MISSIONARY,
    })

    const results = await new MissionarySearchService().searchByName(fullName)
    assert.isTrue(results.some((doc) => doc.fullName === fullName))
  })
})
