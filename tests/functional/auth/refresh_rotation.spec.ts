import { createTestUser } from '#tests/functional/auth/helpers'
import RefreshToken from '#models/refresh_token'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'

const hashOf = (raw: string) => createHash('sha256').update(raw).digest('hex')

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

  test('reuso fora da janela de tolerância invalida a família inteira', async ({ client }) => {
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
    const at2 = (firstRefresh.body() as TokensBody).data.accessToken

    // NOTE: RT1 foi rotacionado há mais de 30 s (fora da janela do ADR-0035) — o
    // reuso é tratado como roubo e dispara a invalidação da família
    await RefreshToken.query()
      .where('tokenHash', hashOf(rt1!))
      .update({ revokedAt: DateTime.now().minus({ minutes: 1 }) })

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

    // NOTE: o access token emitido para a família também deixa de valer na hora,
    // sem esperar o JWT expirar
    const profile = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('authorization', `Bearer ${at2}`)

    profile.assertStatus(401)
  })

  test('replay dentro da janela, do mesmo dispositivo, devolve o mesmo refresh token', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const refreshUrl = router.builder().make('v1.auth.refresh_tokens.store')!

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-client-type', 'mobile')
      .header('x-device-name', 'iPhone 15')
      .json({ login: user.email, password })
    const rt1 = (login.body() as TokensBody).data.refreshToken

    const first = await client
      .post(refreshUrl)
      .header('x-client-type', 'mobile')
      .header('x-device-name', 'iPhone 15')
      .json({ refreshToken: rt1 })
    const replay = await client
      .post(refreshUrl)
      .header('x-client-type', 'mobile')
      .header('x-device-name', 'iPhone 15')
      .json({ refreshToken: rt1 })

    first.assertStatus(200)
    replay.assertStatus(200)
    const rt2 = (first.body() as TokensBody).data.refreshToken
    assert.equal((replay.body() as TokensBody).data.refreshToken, rt2)
    assert.isString((replay.body() as TokensBody).data.accessToken)

    // NOTE: a sessão continua válida: RT2 ainda rotaciona normalmente
    const next = await client
      .post(refreshUrl)
      .header('x-client-type', 'mobile')
      .header('x-device-name', 'iPhone 15')
      .json({ refreshToken: rt2 })
    next.assertStatus(200)
  })

  test('refresh token inexistente é rejeitado', async ({ client }) => {
    const response = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ refreshToken: 'token-que-nao-existe' })

    response.assertStatus(401)
  })
})
