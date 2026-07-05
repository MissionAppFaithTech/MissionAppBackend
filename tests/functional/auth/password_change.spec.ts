import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }

test.group('Auth - troca de senha', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('troca de senha revoga a sessão atual e todas as demais', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const changePassword = await client
      .patch(router.builder().make('v1.account_password.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        currentPassword: password,
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      })

    changePassword.assertStatus(200)

    // NOTE: auth_version foi incrementada — o token emitido antes da troca não vale mais
    const reuse = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    reuse.assertStatus(401)
  })

  test('rejeita troca de senha com senha atual incorreta', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.account_password.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        currentPassword: 'senha-errada',
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      })

    response.assertStatus(422)
  })

  test('login com a senha nova funciona após a troca', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    await client
      .patch(router.builder().make('v1.account_password.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        currentPassword: password,
        newPassword: 'newpassword456',
        newPasswordConfirmation: 'newpassword456',
      })

    const newLogin = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password: 'newpassword456' })

    newLogin.assertStatus(200)
  })
})
