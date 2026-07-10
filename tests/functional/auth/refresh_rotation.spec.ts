import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string; refreshToken?: string } }

test.group('Auth - refresh rotation', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('rotaciona o refresh token e emite um novo access token', async ({ client, assert }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ login: user.email, password })

    const loginBody = login.body() as TokensBody
    const firstAccessToken = loginBody.data.accessToken
    const rt1 = loginBody.data.refreshToken

    const refreshed = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ refreshToken: rt1 })

    refreshed.assertStatus(200)
    const refreshedBody = refreshed.body() as TokensBody
    assert.isString(refreshedBody.data.accessToken)
    assert.isString(refreshedBody.data.refreshToken)
    assert.notEqual(refreshedBody.data.accessToken, firstAccessToken)
    assert.notEqual(refreshedBody.data.refreshToken, rt1)
  })

  test('reuso de refresh token já rotacionado invalida a família inteira', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ login: user.email, password })

    const rt1 = (login.body() as TokensBody).data.refreshToken

    const firstRefresh = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ refreshToken: rt1 })

    const rt2 = (firstRefresh.body() as TokensBody).data.refreshToken

    // NOTE: reutiliza RT1 (já revogado pela primeira rotação) — dispara invalidação da família
    const reuseRt1 = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ refreshToken: rt1 })

    reuseRt1.assertStatus(401)

    // NOTE: RT2, apesar de nunca ter sido usado, também deve estar invalidado
    const reuseRt2 = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ refreshToken: rt2 })

    reuseRt2.assertStatus(401)
  })

  test('refresh token inexistente é rejeitado', async ({ client }) => {
    const response = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ refreshToken: 'token-que-nao-existe' })

    response.assertStatus(401)
  })
})
