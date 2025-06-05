import { createTestUser } from '#tests/functional/auth/helpers'
import { PASSWORD_RESET_EMAIL_JOB_NAME } from '#constants/password_reset'
import { emailQueue } from '#queues/email_queue'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

/**
 * O envio em si (`mail.send`) roda em um worker separado, fora do processo de
 * teste — aqui só verificamos que o request enfileirou o job corretamente
 * (`PasswordResetRequested.dispatch` é aguardado dentro do request, então o
 * job já está no Redis quando a response volta). Cobertura do envio em si:
 * `tests/unit/jobs/auth/send_password_reset_email_job.spec.ts`.
 *
 * Filtra por `job.name` além do email — `emailQueue` é compartilhada entre
 * todos os tipos de email (ver `app/constants/mail.ts`).
 */
async function findEnqueuedJob(email: string) {
  const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed'])
  return (
    jobs.find(
      (candidate) =>
        candidate.name === PASSWORD_RESET_EMAIL_JOB_NAME && candidate.data.email === email
    ) ?? null
  )
}

test.group('Auth - esqueci minha senha', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      await rollback()
    }
  })

  test('enfileira o email de redefinição para email cadastrado', async ({ client, assert }) => {
    const { user } = await createTestUser()

    const response = await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: user.email })

    response.assertStatus(200)

    const job = await findEnqueuedJob(user.email)
    assert.isNotNull(job)
    await job?.remove()
  })

  test('responde 200 mesmo para email não cadastrado — evita user enumeration', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: 'ninguem-cadastrado@example.com' })

    response.assertStatus(200)

    const job = await findEnqueuedJob('ninguem-cadastrado@example.com')
    assert.isNull(job)
  })

  test('rejeita login em formato inválido', async ({ client }) => {
    const response = await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: 'nao-e-um-email' })

    response.assertStatus(422)
  })
})
