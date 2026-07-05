import { createTestUser } from '#tests/functional/auth/helpers'
import { AuthRevocationService } from '#services/auth_revocation_service'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }

test.group('Auth - revogação global via auth_version', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('bump de auth_version invalida access tokens já emitidos, mesmo sem expirar', async ({
    client,
  }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ email: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    // NOTE: simula revogação global disparada por outra fonte (troca de senha,
    // suspensão de conta) sem passar pelo endpoint de troca de senha.
    await new AuthRevocationService().bumpAuthVersion(user.id)

    const response = await client
      .get(router.builder().make('v1.profile.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(401)
  })
})
