import { WELCOME_EMAIL_JOB_NAME } from '#constants/welcome_email'
import { MISSIONARY_INDEXING_JOB_NAME } from '#constants/missionary_search'
import { emailQueue } from '#queues/email_queue'
import { searchIndexingQueue } from '#queues/search_indexing_queue'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { randomBytes } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

/**
 * O envio em si (`mail.send`) roda em um worker separado, fora do processo de
 * teste — aqui só verificamos que o request enfileirou o job corretamente
 * (`UserRegistered.dispatch` é aguardado dentro do request, então o job já
 * está no Redis quando a response volta). Cobertura do envio em si:
 * `tests/unit/jobs/user/send_welcome_email_job.spec.ts`.
 *
 * Filtra por `job.name` além do email — `emailQueue` é compartilhada entre
 * todos os tipos de email.
 */
async function findEnqueuedJob(email: string) {
  const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed'])
  return (
    jobs.find(
      (candidate) => candidate.name === WELCOME_EMAIL_JOB_NAME && candidate.data.email === email
    ) ?? null
  )
}

async function findEnqueuedIndexingJob(email: string) {
  const jobs = await searchIndexingQueue.getJobs(['waiting', 'active', 'completed'])
  return (
    jobs.find(
      (candidate) =>
        candidate.name === MISSIONARY_INDEXING_JOB_NAME && candidate.data.email === email
    ) ?? null
  )
}

test.group('Conta - criação', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      await rollback()
    }
  })

  test('enfileira o email de boas-vindas ao criar a conta', async ({ client, assert }) => {
    const email = `test_${uuidv7()}@example.com`

    const response = await client.post(router.builder().make('v1.account.store')!).json({
      fullName: 'Test User',
      username: `test_${uuidv7().replaceAll('-', '').slice(0, 20)}`,
      phoneNumber: '+5511912345678',
      gender: 'MALE',
      email,
      password: 'password123',
      passwordConfirmation: 'password123',
    })

    response.assertStatus(200)

    const job = await findEnqueuedJob(email)
    assert.isNotNull(job)
    assert.equal(job?.data.fullName, 'Test User')
    await job?.remove()

    // NOTE: cadastro público sempre cria SUPPORTER (default da coluna
    // `role`) — não existe hoje um fluxo que crie MISSIONARY na criação.
    // Cobertura da indexação em si (quando o role É missionário):
    // `tests/unit/listeners/user/index_missionary_listener.spec.ts`.
    const indexingJob = await findEnqueuedIndexingJob(email)
    assert.isNull(indexingJob)
  })

  test('devolve o usuário com os defaults do banco e o role no JWT', async ({ client, assert }) => {
    const email = `test_${uuidv7()}@example.com`
    // NOTE: senha gerada por execução (CSPRNG) — nada fixo no código
    const password = randomBytes(12).toString('base64url')

    const response = await client.post(router.builder().make('v1.account.store')!).json({
      fullName: 'Default User',
      username: `test_${uuidv7().replaceAll('-', '').slice(0, 20)}`,
      phoneNumber: '+5511912345678',
      gender: 'FEMALE',
      email,
      password,
      passwordConfirmation: password,
    })

    response.assertStatus(200)
    const { user, accessToken } = (
      response.body() as {
        data: {
          user: { role: string; biography: string | null; profilePictureId: string | null }
          accessToken: string
        }
      }
    ).data
    assert.equal(user.role, 'SUPPORTER')
    assert.isNull(user.biography)
    assert.isNull(user.profilePictureId)

    const claims = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'))
    assert.equal(claims.role, 'SUPPORTER')

    const job = await findEnqueuedJob(email)
    assert.equal((job?.data as { role?: string } | undefined)?.role, 'SUPPORTER')
    await job?.remove()
  })

  test('rejeita criação sem fullName', async ({ client }) => {
    const response = await client.post(router.builder().make('v1.account.store')!).json({
      username: `test_${uuidv7().replaceAll('-', '').slice(0, 20)}`,
      phoneNumber: '+5511912345678',
      gender: 'MALE',
      email: `test_${uuidv7()}@example.com`,
      password: 'password123',
      passwordConfirmation: 'password123',
    })

    response.assertStatus(422)
  })
})
