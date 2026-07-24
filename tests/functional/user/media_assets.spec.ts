import { createTestUser } from '#tests/functional/auth/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }

test.group('Media assets', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('registra metadata de um arquivo autenticado', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    login.assertStatus(200)
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .post(router.builder().make('v1.media_assets.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        bucket: 'missionapp-local',
        fileKey: 'avatars/test.png',
        mimeType: 'image/png',
        fileSizeBytes: 1234,
      })

    response.assertStatus(200)
  })
})
