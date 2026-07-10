import { createTestUser } from '#tests/functional/auth/helpers'
import { PASSWORD_RESET_EMAIL_JOB_NAME } from '#constants/password_reset'
import type { PasswordResetRequestedPayload } from '#types/events/auth/password_reset_requested'
import { emailQueue } from '#queues/email_queue'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

type TokensBody = { data: { accessToken: string } }

function extractResetToken(resetUrl: string): string {
  const match = resetUrl.match(/token=([a-f0-9]+)/)
  if (!match) throw new Error('reset token não encontrado na resetUrl do job enfileirado')
  return match[1]!
}

/**
 * O envio do email roda em worker separado — aqui pegamos o token direto do
 * job que o request enfileirou (mesma `resetUrl` que iria pro corpo do
 * email). Ver `tests/functional/auth/forgot_password.spec.ts` para o motivo.
 * Filtra por `job.name` — `emailQueue` é compartilhada entre todos os tipos
 * de email.
 */
async function tokenFromEnqueuedJob(email: string): Promise<string> {
  const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed'])
  const job = jobs.find(
    (candidate) =>
      candidate.name === PASSWORD_RESET_EMAIL_JOB_NAME && candidate.data.email === email
  )
  if (!job) throw new Error('nenhum job de redefinição de senha enfileirado para esse email')
  await job.remove()
  return extractResetToken((job.data as PasswordResetRequestedPayload).resetUrl)
}

test.group('Auth - redefinir senha', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return async () => {
      await rollback()
    }
  })

  test('redefine a senha com token válido, revoga sessões e permite login com a senha nova', async ({
    client,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: user.email })

    const token = await tokenFromEnqueuedJob(user.email)

    const reset = await client
      .patch(router.builder().make('v1.auth.reset_password.update')!)
      .json({ token, newPassword: 'novaSenha456', newPasswordConfirmation: 'novaSenha456' })

    reset.assertStatus(200)

    // NOTE: sessão anterior revogada — auth_version incrementada pelo reset
    const reuse = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessToken}`)
    reuse.assertStatus(401)

    const newLogin = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password: 'novaSenha456' })
    newLogin.assertStatus(200)
  })

  test('rejeita token inexistente', async ({ client }) => {
    const response = await client
      .patch(router.builder().make('v1.auth.reset_password.update')!)
      .json({
        token: 'token-que-nunca-existiu',
        newPassword: 'novaSenha456',
        newPasswordConfirmation: 'novaSenha456',
      })

    response.assertStatus(401)
  })

  test('rejeita token expirado', async ({ client }) => {
    const { user } = await createTestUser()

    await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: user.email })

    const token = await tokenFromEnqueuedJob(user.email)

    await user.refresh()
    user.recoveryPasswordTokenExpiresAt = DateTime.now().minus({ minutes: 1 })
    await user.save()

    const response = await client
      .patch(router.builder().make('v1.auth.reset_password.update')!)
      .json({ token, newPassword: 'novaSenha456', newPasswordConfirmation: 'novaSenha456' })

    response.assertStatus(401)
  })
})
