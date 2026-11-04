import { createTestUser } from '#tests/functional/auth/helpers'
import RefreshToken from '#models/refresh_token'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { createHash, randomUUID } from 'node:crypto'

type TokensBody = { data: { accessToken: string; refreshToken: string } }
type SessionsBody = {
  data: Array<{
    id: string
    deviceKind: string
    deviceName: string | null
    createdAt: string
    startedAt: string
    current: boolean
  }>
}

/** Cabeçalhos de aparelho que o BFF envia (ADR-0038). */
type Device = { id?: string; kind?: string; name?: string }

function login(
  client: ApiClient,
  credentials: { login: string; password: string },
  device: Device = {}
) {
  const request = client.post(router.builder().make('v1.auth.access_tokens.store')!)
  if (device.id) request.header('x-device-id', device.id)
  if (device.kind) request.header('x-device-kind', device.kind)
  if (device.name) request.header('x-device-name', device.name)
  return request.json(credentials)
}

async function listSessions(client: ApiClient, accessToken: string) {
  const response = await client
    .get(router.builder().make('v1.auth.sessions.index')!)
    .header('Authorization', `Bearer ${accessToken}`)
  response.assertStatus(200)
  return (response.body() as unknown as SessionsBody).data
}

function tokens(response: { body(): unknown }) {
  return (response.body() as TokensBody).data
}

test.group('Auth - uma sessão por aparelho', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('novo login no mesmo aparelho substitui a sessão anterior', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const credentials = { login: user.email, password }
    const device = { id: randomUUID(), kind: 'desktop', name: 'Chrome no Windows' }

    const first = tokens(await login(client, credentials, device))
    const second = tokens(await login(client, credentials, device))

    const sessions = await listSessions(client, second.accessToken)
    assert.lengthOf(sessions, 1)
    assert.isTrue(sessions[0]!.current)

    // NOTE: o access token da sessão substituída para de valer na hora (blocklist da família).
    const useOld = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${first.accessToken}`)
    useOld.assertStatus(401)

    const refreshOld = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .json({ refreshToken: first.refreshToken })
    refreshOld.assertStatus(401)
  })

  test('aparelhos diferentes mantêm sessões separadas, com o tipo de cada um', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const credentials = { login: user.email, password }

    await login(client, credentials, { id: randomUUID(), kind: 'mobile', name: 'Safari no iOS' })
    const pc = tokens(
      await login(client, credentials, {
        id: randomUUID(),
        kind: 'desktop',
        name: 'Chrome no Windows',
      })
    )

    const sessions = await listSessions(client, pc.accessToken)
    assert.lengthOf(sessions, 2)
    assert.sameMembers(
      sessions.map((session) => session.deviceKind),
      ['mobile', 'desktop']
    )
    assert.equal(sessions.find((session) => session.current)!.deviceKind, 'desktop')
  })

  test('sem x-device-id cada login abre uma sessão nova e o tipo é unknown', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const credentials = { login: user.email, password }

    await login(client, credentials)
    const second = tokens(await login(client, credentials))

    const sessions = await listSessions(client, second.accessToken)
    assert.lengthOf(sessions, 2)
    assert.deepEqual(
      sessions.map((session) => session.deviceKind),
      ['unknown', 'unknown']
    )
  })

  test('o mesmo x-device-id de outro usuário não encerra a sessão dele', async ({ client }) => {
    const { user: userA, password: passwordA } = await createTestUser()
    const { user: userB, password: passwordB } = await createTestUser()
    const device = { id: randomUUID(), kind: 'desktop' }

    const a = tokens(await login(client, { login: userA.email, password: passwordA }, device))
    await login(client, { login: userB.email, password: passwordB }, device)

    const useA = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${a.accessToken}`)
    useA.assertStatus(200)
  })

  test('guarda só o hash do x-device-id', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const deviceId = randomUUID()

    await login(client, { login: user.email, password }, { id: deviceId, kind: 'tablet' })

    const token = await RefreshToken.query().where('userId', user.id).firstOrFail()
    assert.equal(token.deviceId, createHash('sha256').update(deviceId).digest('hex'))
    assert.equal(token.deviceKind, 'tablet')
  })

  test('o refresh herda o aparelho e a lista mostra o início da sessão', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const credentials = { login: user.email, password }
    const device = { id: randomUUID(), kind: 'mobile', name: 'Chrome no Android' }

    const first = tokens(await login(client, credentials, device))
    const sessionsBefore = await listSessions(client, first.accessToken)

    // NOTE: o refresh não repete x-device-id/x-device-kind; os dados vêm do token anterior.
    const refreshed = await client
      .post(router.builder().make('v1.auth.refresh_tokens.store')!)
      .header('x-device-name', device.name)
      .json({ refreshToken: first.refreshToken })
    refreshed.assertStatus(200)

    const tokensAfter = await RefreshToken.query().where('userId', user.id).whereNull('revokedAt')
    assert.lengthOf(tokensAfter, 1)
    assert.equal(tokensAfter[0]!.deviceKind, 'mobile')
    assert.equal(tokensAfter[0]!.deviceId, createHash('sha256').update(device.id).digest('hex'))

    const sessionsAfter = await listSessions(client, tokens(refreshed).accessToken)
    assert.lengthOf(sessionsAfter, 1)
    assert.equal(sessionsAfter[0]!.deviceKind, 'mobile')
    assert.equal(sessionsAfter[0]!.startedAt, sessionsBefore[0]!.startedAt)

    // NOTE: depois da rotação, um novo login no mesmo aparelho continua substituindo a sessão.
    const again = tokens(await login(client, credentials, device))
    assert.lengthOf(await listSessions(client, again.accessToken), 1)
  })

  test('replay dentro da janela vindo de outro x-device-id invalida a família', async ({
    client,
  }) => {
    const { user, password } = await createTestUser()
    const device = { id: randomUUID(), kind: 'desktop', name: 'Chrome no Windows' }

    const first = tokens(await login(client, { login: user.email, password }, device))

    const rotate = (deviceId: string) =>
      client
        .post(router.builder().make('v1.auth.refresh_tokens.store')!)
        .header('x-device-id', deviceId)
        .header('x-device-name', device.name)
        .json({ refreshToken: first.refreshToken })

    const sameDevice = await rotate(device.id)
    sameDevice.assertStatus(200)
    const otherDevice = await rotate(randomUUID())
    otherDevice.assertStatus(401)
  })

  test('rejeita x-device-id e x-device-kind inválidos com 422', async ({ client }) => {
    const { user, password } = await createTestUser()
    const credentials = { login: user.email, password }

    const shortId = await login(client, credentials, { id: 'curto' })
    shortId.assertStatus(422)
    shortId.assertBodyContains({ code: 'E_VALIDATION_ERROR' })

    const badChars = await login(client, credentials, { id: 'id com espaços e acentuação!' })
    badChars.assertStatus(422)

    const badKind = await login(client, credentials, { id: randomUUID(), kind: 'smartwatch' })
    badKind.assertStatus(422)
  })
})
