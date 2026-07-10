import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string; refreshToken: string } }

test.group('Auth - logout', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('bloqueia o access token atual — reuso após logout é rejeitado', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const { accessToken, refreshToken } = (login.body() as TokensBody).data

    const logout = await client
      .delete(router.builder().make('v1.auth.access_tokens.destroy')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ refreshToken })

    logout.assertStatus(200)

    const reuse = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    reuse.assertStatus(401)
    assert.isTrue(true)
  })

  test('logout revoga apenas a sessão do dispositivo atual — outras sessões continuam válidas', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    // NOTE: duas sessões independentes do mesmo usuário — duas famílias distintas
    const sessionA = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const sessionB = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const { accessToken: accessTokenA, refreshToken: refreshTokenA } = (
      sessionA.body() as TokensBody
    ).data
    const { refreshToken: refreshTokenB } = (sessionB.body() as TokensBody).data

    const logout = await client
      .delete(router.builder().make('v1.auth.access_tokens.destroy')!)
      .header('Authorization', `Bearer ${accessTokenA}`)
      .json({ refreshToken: refreshTokenA })

    logout.assertStatus(200)

    // NOTE: sessão B nunca fez logout — seu refresh token ainda deve rotacionar normalmente
    const refreshB = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .json({ refreshToken: refreshTokenB })

    refreshB.assertStatus(200)
    assert.isString((refreshB.body() as TokensBody).data.accessToken)
  })

  test('logout funciona sem access token válido — revoga via refresh token mesmo assim', async ({
    client,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const { refreshToken } = (login.body() as TokensBody).data

    // NOTE: sem header Authorization — simula access token expirado/ausente,
    // que não deve impedir o logout (RFC 7009)
    const logout = await client
      .delete(router.builder().make('v1.auth.access_tokens.destroy')!)
      .json({ refreshToken })

    logout.assertStatus(200)

    const refresh = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .json({ refreshToken })

    refresh.assertStatus(401)
  })

  test('logout é idempotente — refresh token desconhecido ainda responde 200', async ({
    client,
  }) => {
    const logout = await client
      .delete(router.builder().make('v1.auth.access_tokens.destroy')!)
      .json({ refreshToken: 'token-que-nunca-existiu' })

    logout.assertStatus(200)
  })
})
