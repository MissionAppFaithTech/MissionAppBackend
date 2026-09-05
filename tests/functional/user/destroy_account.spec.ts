import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import User from '#models/user'

type TokensBody = { data: { accessToken: string } }

test.group('User - destroy account', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('exclui permanentemente a conta de um apoiador', async ({ client, assert }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .delete(router.builder().make('v1.account.destroy')!)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(204)

    const found = await User.find(user.id)
    assert.isNull(found)
  })

  test('exclui logicamente a conta de um missionário', async ({ client, assert }) => {
    const { user, password } = await createMissionaryTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .delete(router.builder().make('v1.account.destroy')!)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(204)

    const found = await User.query().where('id', user.id).first()
    assert.isNotNull(found)
    assert.isNotNull(found?.deletedAt)
  })
})
