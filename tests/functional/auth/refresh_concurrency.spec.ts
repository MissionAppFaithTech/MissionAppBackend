import { createTestUser } from '#tests/functional/auth/helpers'
import RefreshToken from '#models/refresh_token'
import User from '#models/user'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string; refreshToken: string } }

const PARALLEL_REFRESHES = 5

/**
 * ADR-0035: vários refreshes simultâneos com o mesmo token (BFF em várias
 * instâncias) não podem derrubar a sessão nem gerar tokens órfãos.
 *
 * NOTE: sem `wrapInGlobalTransaction` de propósito — a transação global prende
 * uma única conexão e serializaria os pedidos, escondendo a corrida que o
 * `FOR UPDATE` resolve. Cada teste apaga o usuário que criou (cascata nos tokens).
 */
test.group('Auth - refresh concorrente', (group) => {
  const createdUserIds: string[] = []

  group.each.teardown(async () => {
    if (createdUserIds.length > 0) {
      await User.query().whereIn('id', createdUserIds.splice(0)).delete()
    }
  })

  test('refreshes simultâneos com o mesmo token recebem o mesmo sucessor', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    createdUserIds.push(user.id)

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .header('x-client-type', 'web')
      .json({ login: user.email, password })
    const rt1 = (login.body() as TokensBody).data.refreshToken

    const responses = await Promise.all(
      Array.from({ length: PARALLEL_REFRESHES }, () =>
        client
          .post(router.builder().make('v1.auth.refresh_tokens.store')!)
          .header('x-client-type', 'web')
          .json({ refreshToken: rt1 })
      )
    )

    for (const response of responses) response.assertStatus(200)
    const refreshTokens = new Set(
      responses.map((response) => (response.body() as TokensBody).data.refreshToken)
    )
    assert.equal(refreshTokens.size, 1, 'todos recebem o mesmo refresh token')

    // NOTE: exatamente um sucessor ativo: login (revogado) + 1 emitido na rotação
    const family = await RefreshToken.query().where('userId', user.id)
    assert.lengthOf(family, 2)
    assert.lengthOf(
      family.filter((token) => token.revokedAt === null),
      1
    )
  })
})
