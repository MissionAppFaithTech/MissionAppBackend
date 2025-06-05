import { createTestUser } from '#tests/functional/auth/helpers'
import { AuthenticationStatus } from '#enums/authentication_audit/authentication_status'
import AuthenticationAudit from '#models/authentication_audit'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string; refreshToken: string } }

test.group('Auth - login', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('loga com credenciais válidas e retorna access token', async ({ client, assert }) => {
    const { user, password } = await createTestUser()

    const response = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    response.assertStatus(200)
    assert.isString((response.body() as TokensBody).data.accessToken)

    const audit = await AuthenticationAudit.query().where('userId', user.id).firstOrFail()
    assert.equal(audit.status, AuthenticationStatus.SUCCESS)
  })

  test('refresh token sempre vem no corpo da resposta, independente do cliente', async ({
    client,
    assert,
  }) => {
    // NOTE: a API é consumida por um BFF (web) e por apps nativos (mobile), nunca
    // diretamente por um browser — um cookie setado aqui nunca chegaria ao
    // usuário final. Por isso não há mais distinção de entrega por cliente
    // (ver ADR-0023).
    const { user, password } = await createTestUser()

    const webResponse = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    assert.isString((webResponse.body() as TokensBody).data.refreshToken)

    const mobileResponse = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-client-type', 'mobile')
      .json({ login: user.email, password })

    assert.isString((mobileResponse.body() as TokensBody).data.refreshToken)
  })

  test('rejeita credenciais inválidas', async ({ client, assert }) => {
    const { user } = await createTestUser()

    const response = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password: 'wrong-password' })

    response.assertStatus(400)

    const audit = await AuthenticationAudit.query().where('userId', user.id).firstOrFail()
    assert.equal(audit.status, AuthenticationStatus.INCORRECT_PASSWORD)
  })

  test('registra auditoria de usuário inexistente sem vincular a nenhum usuário', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: 'ninguem-cadastrado@example.com', password: 'wrong-password' })

    response.assertStatus(400)

    const audit = await AuthenticationAudit.query()
      .whereNull('userId')
      .where('status', AuthenticationStatus.USER_NOT_EXISTS)
      .orderBy('createdAt', 'desc')
      .firstOrFail()
    assert.isNull(audit.userId)
  })
})
