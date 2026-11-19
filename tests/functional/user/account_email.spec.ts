import User from '#models/user'
import { createTestUser, randomPassword } from '#tests/functional/auth/helpers'
import router from '@adonisjs/core/services/router'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type UserBody = { data: { user: { email: string } } }

test.group('User - account email update', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('atualiza o e-mail de login mediante confirmação da senha atual', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken
    const newEmail = `novo.${Date.now()}@example.com`

    const response = await client
      .patch(router.builder().make('v1.account_email.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        email: newEmail,
        currentPassword: password,
      })

    response.assertStatus(200)
    const body = response.body() as UserBody
    assert.equal(body.data.user.email, newEmail)

    const persisted = await User.findOrFail(user.id)
    assert.equal(persisted.email, newEmail)

    // Login com novo e-mail funciona e login com e-mail antigo falha
    const oldLogin = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    oldLogin.assertStatus(400)

    const newLogin = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: newEmail, password })
    newLogin.assertStatus(200)
  })

  test('rejeita requisição sem autenticação com 401', async ({ client }) => {
    const response = await client.patch(router.builder().make('v1.account_email.update')!).json({
      email: `anon.${Date.now()}@example.com`,
      currentPassword: randomPassword(),
    })

    response.assertStatus(401)
  })

  test('rejeita formato de e-mail inválido com 422', async ({ client, assert }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.account_email.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        email: 'email-invalido',
        currentPassword: password,
      })

    response.assertStatus(422)
    assert.equal((response.body() as any).errors[0].field, 'email')
  })

  test('rejeita troca de e-mail quando a senha atual está incorreta', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.account_email.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        email: `outro.${Date.now()}@example.com`,
        currentPassword: randomPassword(),
      })

    response.assertStatus(422)
    assert.equal((response.body() as any).errors[0].field, 'currentPassword')
    assert.equal((response.body() as any).errors[0].rule, 'current_password')
  })

  test('rejeita troca de e-mail quando o novo e-mail é igual ao atual', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.account_email.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        email: user.email.toUpperCase(),
        currentPassword: password,
      })

    response.assertStatus(422)
    assert.equal((response.body() as any).errors[0].field, 'email')
  })

  test('rejeita troca de e-mail quando o endereço já pertence a outra conta', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const { user: otherUser } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.account_email.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        email: otherUser.email,
        currentPassword: password,
      })

    response.assertStatus(422)
    assert.equal((response.body() as any).errors[0].field, 'email')
    assert.equal((response.body() as any).errors[0].rule, 'database.unique')
  })
})
