import { createTestUser } from '#tests/functional/auth/helpers'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

test.group('Auth - esqueci minha senha', (group) => {
  let fakeMailer: ReturnType<typeof mail.fake>

  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    fakeMailer = mail.fake()
    return async () => {
      mail.restore()
      await rollback()
    }
  })

  test('envia email de redefinição para email cadastrado', async ({ client }) => {
    const { user } = await createTestUser()

    const response = await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: user.email })

    response.assertStatus(200)
    fakeMailer.messages.assertSent((message) => message.hasRecipient('to', user.email))
  })

  test('responde 200 mesmo para email não cadastrado — evita user enumeration', async ({
    client,
  }) => {
    const response = await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: 'ninguem-cadastrado@example.com' })

    response.assertStatus(200)
    fakeMailer.messages.assertNoneSent()
  })

  test('rejeita login em formato inválido', async ({ client }) => {
    const response = await client
      .post(router.builder().make('v1.auth.forgot_password.store')!)
      .json({ login: 'nao-e-um-email' })

    response.assertStatus(422)
  })
})
