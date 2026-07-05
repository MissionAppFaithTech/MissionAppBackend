import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string; refreshToken: string } }
type SessionsBody = {
  data: Array<{
    id: string
    deviceType: string
    deviceName: string | null
    current: boolean
  }>
}

test.group('Auth - sessions', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('lista as sessões ativas do usuário, marcando a sessão corrente', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const sessionA = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-client-type', 'mobile')
      .header('x-device-name', 'iPhone 15')
      .json({ email: user.email, password })

    await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-device-name', 'Chrome no macOS')
      .json({ email: user.email, password })

    const { accessToken: accessTokenA } = (sessionA.body() as TokensBody).data

    const list = await client
      .get(router.builder().make('v1.auth.sessions.index')!)
      .header('Authorization', `Bearer ${accessTokenA}`)

    list.assertStatus(200)
    const sessions = (list.body() as unknown as SessionsBody).data

    assert.lengthOf(sessions, 2)
    assert.sameMembers(
      sessions.map((s) => s.deviceName),
      ['iPhone 15', 'Chrome no macOS']
    )
    assert.isTrue(sessions.some((s) => s.current))
    assert.isTrue(sessions.some((s) => !s.current))
  })

  test('revoga remotamente uma sessão específica sem afetar as demais', async ({ client }) => {
    const { user, password } = await createTestUser()

    const sessionA = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })
    const sessionB = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })

    const { accessToken: accessTokenA, refreshToken: refreshTokenA } = (
      sessionA.body() as TokensBody
    ).data
    const { accessToken: accessTokenB, refreshToken: refreshTokenB } = (
      sessionB.body() as TokensBody
    ).data

    const list = await client
      .get(router.builder().make('v1.auth.sessions.index')!)
      .header('Authorization', `Bearer ${accessTokenA}`)
    const sessionBFamilyId = (list.body() as unknown as SessionsBody).data.find(
      (s) => !s.current
    )!.id

    const revoke = await client
      .delete(
        router.builder().params({ familyId: sessionBFamilyId }).make('v1.auth.sessions.destroy')!
      )
      .header('Authorization', `Bearer ${accessTokenA}`)

    revoke.assertStatus(200)

    // NOTE: sessão B revogada — access token corrente dela é rejeitado imediatamente
    // (blocklist de família), sem esperar os 15 min de expiração natural.
    const useB = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessTokenB}`)
    useB.assertStatus(401)

    const refreshB = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .json({ refreshToken: refreshTokenB })
    refreshB.assertStatus(401)

    // NOTE: sessão A não foi afetada
    const refreshA = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .json({ refreshToken: refreshTokenA })
    refreshA.assertStatus(200)
  })

  test('rejeita revogar sessão de outro usuário', async ({ client }) => {
    const { user: userA, password: passwordA } = await createTestUser()
    const { user: userB, password: passwordB } = await createTestUser()

    const loginB = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: userB.email, password: passwordB })

    const loginA = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: userA.email, password: passwordA })

    const { accessToken: accessTokenA } = (loginA.body() as TokensBody).data

    const listB = await client
      .get(router.builder().make('v1.auth.sessions.index')!)
      .header('Authorization', `Bearer ${(loginB.body() as TokensBody).data.accessToken}`)
    const familyIdB = (listB.body() as unknown as SessionsBody).data[0]!.id

    const response = await client
      .delete(router.builder().params({ familyId: familyIdB }).make('v1.auth.sessions.destroy')!)
      .header('Authorization', `Bearer ${accessTokenA}`)

    response.assertStatus(404)
  })

  test('logout em todos os dispositivos revoga todas as sessões e invalida access tokens ativos', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const sessionA = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })
    const sessionB = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })

    const { accessToken: accessTokenA } = (sessionA.body() as TokensBody).data
    const { accessToken: accessTokenB, refreshToken: refreshTokenB } = (
      sessionB.body() as TokensBody
    ).data

    const logoutAll = await client
      .delete(router.builder().make('v1.auth.all_sessions.destroy')!)
      .header('Authorization', `Bearer ${accessTokenA}`)

    logoutAll.assertStatus(200)

    const useA = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessTokenA}`)
    useA.assertStatus(401)

    const useB = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessTokenB}`)
    useB.assertStatus(401)

    const refreshB = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .json({ refreshToken: refreshTokenB })
    refreshB.assertStatus(401)

    assert.isTrue(true)
  })
})
