import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { createMissionaryTestUser } from './helpers.ts'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }

test.group('Missionary - profile update', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('atualiza a seção sobre do missionário autenticado', async ({ client }) => {
    const { user, password } = await createMissionaryTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.missionary.about.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ aboutMe: 'Texto sobre mim' })

    response.assertStatus(200)
  })
})
