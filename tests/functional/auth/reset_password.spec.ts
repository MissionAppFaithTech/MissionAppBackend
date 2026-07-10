import { createTestUser } from '#tests/functional/auth/helpers'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

type TokensBody = { data: { accessToken: string } }

function extractResetToken(html: string): string {
  const match = html.match(/token=([a-f0-9]+)/)
  if (!match) throw new Error('reset token não encontrado no corpo do email')
  return match[1]!
}

test.group('Auth - redefinir senha', (group) => {
  let fakeMailer: ReturnType<typeof mail.fake>

  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    fakeMailer = mail.fake()
    return async () => {
      mail.restore()
      await rollback()
    }
  })

  test('redefine a senha com token válido, revoga sessões e permite login com a senha nova', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: user.email })

    const [sentMessage] = fakeMailer.messages.sent()
    assert.exists(sentMessage)
    const token = extractResetToken(String(sentMessage!.nodeMailerMessage.html))

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

  test('rejeita token expirado', async ({ client, assert }) => {
    const { user } = await createTestUser()

    await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: user.email })

    const [sentMessage] = fakeMailer.messages.sent()
    assert.exists(sentMessage)
    const token = extractResetToken(String(sentMessage!.nodeMailerMessage.html))

    await user.refresh()
    user.recoveryPasswordTokenExpiresAt = DateTime.now().minus({ minutes: 1 })
    await user.save()

    const response = await client
      .patch(router.builder().make('v1.auth.reset_password.update')!)
      .json({ token, newPassword: 'novaSenha456', newPasswordConfirmation: 'novaSenha456' })

    response.assertStatus(401)
  })
})
