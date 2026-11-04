import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser, uniqueClientIp } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { randomBytes } from 'node:crypto'
import { v7 as uuidv7 } from 'uuid'

type Envelope = {
  message: string
  code: string
  errors?: Array<{ field: string; rule: string; message: string }>
  meta?: { retryAfterSeconds?: number }
}

type TokensBody = { data: { accessToken: string } }

/** Envelope mínimo: `message` e `code` sempre presentes e não vazios (ADR-0034). */
function assertEnvelope(
  assert: { isString: Function; match: Function; isNotEmpty: Function },
  body: Envelope
) {
  assert.isString(body.message)
  assert.isNotEmpty(body.message)
  assert.match(body.code, /^E_[A-Z0-9_]+$/)
}

test.group('Envelope de erro único (ADR-0034)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('422 do VineJS traz code e errors por campo', async ({ client, assert }) => {
    const response = await client.post(router.builder().make('v1.account.store')!).json({})

    response.assertStatus(422)
    const body = response.body() as Envelope
    assertEnvelope(assert, body)
    assert.equal(body.code, 'E_VALIDATION_ERROR')
    assert.isArray(body.errors)
    assert.isAbove(body.errors!.length, 0)
    for (const item of body.errors!) {
      assert.properties(item, ['field', 'rule', 'message'])
      assert.isNotEmpty(item.field)
    }
  })

  test('401 do guard de autenticação sai no envelope, sem errors', async ({ client, assert }) => {
    const response = await client.get(router.builder().make('v1.profile.show')!)

    response.assertStatus(401)
    const body = response.body() as Envelope
    assertEnvelope(assert, body)
    assert.equal(body.code, 'E_UNAUTHORIZED_ACCESS')
    assert.notProperty(body, 'errors')
  })

  test('credenciais inválidas saem como E_INVALID_CREDENTIALS', async ({ client, assert }) => {
    const { user } = await createTestUser()

    const response = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      // NOTE: senha errada gerada por execução (CSPRNG) — nada fixo no código
      .json({ login: user.email, password: randomBytes(16).toString('hex') })

    response.assertStatus(400)
    const body = response.body() as Envelope
    assertEnvelope(assert, body)
    assert.equal(body.code, 'E_INVALID_CREDENTIALS')
  })

  test('conta bloqueada (423) traz Retry-After e meta.retryAfterSeconds', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    user.lockedAt = DateTime.now()
    user.lockCount = 1
    await user.save()

    const response = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    response.assertStatus(423)
    const body = response.body() as Envelope
    assertEnvelope(assert, body)
    assert.equal(body.code, 'E_ACCOUNT_LOCKED')
    const retryAfter = Number(response.header('retry-after'))
    assert.isAbove(retryAfter, 0)
    assert.equal(body.meta?.retryAfterSeconds, retryAfter)
  })

  test('rota inexistente sai como E_ROUTE_NOT_FOUND em pt-BR', async ({ client, assert }) => {
    const response = await client.get('/api/v1/rota-que-nao-existe')

    response.assertStatus(404)
    const body = response.body() as Envelope
    assert.deepEqual(body, { message: 'Rota não encontrada.', code: 'E_ROUTE_NOT_FOUND' })
  })

  test('exceção de domínio mantém seu code', async ({ client, assert }) => {
    const response = await client
      .get(router.builder().params({ id: uuidv7() }).make('v1.missionary_agencies.show')!)
      .header('X-Forwarded-For', uniqueClientIp())

    response.assertStatus(404)
    const body = response.body() as Envelope
    assertEnvelope(assert, body)
    assert.equal(body.code, 'E_MISSIONARY_AGENCY_NOT_FOUND')
  })

  test('username em uso (regra do service) aponta o campo em errors', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const { user: other } = await createTestUser()
    // NOTE: o username do helper passa de 32 caracteres; o validator recusaria antes do service.
    other.username = `taken_${uuidv7().replaceAll('-', '').slice(-12)}`
    await other.save()
    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ username: other.username })

    response.assertStatus(422)
    const body = response.body() as Envelope
    assert.equal(body.code, 'E_VALIDATION_ERROR')
    assert.equal(body.message, 'Nome de usuário já está em uso')
    assert.deepEqual(body.errors, [
      { field: 'username', rule: 'database.unique', message: 'Nome de usuário já está em uso' },
    ])
  })

  test('foto de perfil inexistente aponta o campo profilePictureId', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ profilePictureId: uuidv7() })

    response.assertStatus(422)
    const body = response.body() as Envelope
    assert.equal(body.code, 'E_VALIDATION_ERROR')
    assert.deepEqual(body.errors, [
      {
        field: 'profilePictureId',
        rule: 'database.exists',
        message: 'Imagem de perfil informada não existe',
      },
    ])
  })

  test('comunidade de fé inexistente aponta o campo faithCommunityId', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createMissionaryTestUser()
    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: uuidv7() })

    response.assertStatus(422)
    const body = response.body() as Envelope
    assert.equal(body.code, 'E_VALIDATION_ERROR')
    assert.deepEqual(body.errors, [
      {
        field: 'faithCommunityId',
        rule: 'database.exists',
        message: 'Comunidade de fé informada não existe',
      },
    ])
  })

  test('429 do rate limit traz E_TOO_MANY_REQUESTS e o tempo de espera', async ({
    client,
    assert,
  }) => {
    const url = router.builder().make('v1.username_availability.show')!
    const clientIp = uniqueClientIp()

    for (let attempt = 1; attempt <= 20; attempt++) {
      const ok = await client
        .get(url)
        .qs({ username: 'livre_123' })
        .header('X-Forwarded-For', clientIp)
      ok.assertStatus(200)
    }

    const limited = await client
      .get(url)
      .qs({ username: 'livre_123' })
      .header('X-Forwarded-For', clientIp)

    limited.assertStatus(429)
    assert.equal(limited.header('retry-after'), '60')
    const body = limited.body() as Envelope
    assertEnvelope(assert, body)
    assert.equal(body.code, 'E_TOO_MANY_REQUESTS')
    assert.deepEqual(body.meta, { retryAfterSeconds: 60 })
  })
})
