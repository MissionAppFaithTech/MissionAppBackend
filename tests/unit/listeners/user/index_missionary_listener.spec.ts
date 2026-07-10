import IndexMissionaryListener from '#listeners/user/index_missionary_listener'
import UserRegistered from '#events/user/user_registered'
import { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import { searchIndexingQueue } from '#queues/search_indexing_queue'
import { UserRole } from '#enums/user/user_role'
import { v7 as uuidv7 } from 'uuid'
import { test } from '@japa/runner'

async function findEnqueuedJob(email: string) {
  const jobs = await searchIndexingQueue.getJobs(['waiting', 'active', 'completed'])
  return (
    jobs.find(
      (candidate) =>
        candidate.name === MISSIONARY_INDEXING_JOB_NAME && candidate.data.email === email
    ) ?? null
  )
}

test.group('IndexMissionaryListener', () => {
  test('enfileira a indexação quando o usuário é missionário', async ({ assert }) => {
    const email = `${uuidv7()}@example.com`
    const event = new UserRegistered(uuidv7(), 'Missionário', email, UserRole.MISSIONARY)

    await new IndexMissionaryListener().handle(event)

    const job = await findEnqueuedJob(email)
    assert.isNotNull(job)
    await job?.remove()
  })

  test('não enfileira nada quando o usuário não é missionário', async ({ assert }) => {
    const email = `${uuidv7()}@example.com`
    const event = new UserRegistered(uuidv7(), 'Apoiador', email, UserRole.SUPPORTER)

    await new IndexMissionaryListener().handle(event)

    const job = await findEnqueuedJob(email)
    assert.isNull(job)
  })
})
