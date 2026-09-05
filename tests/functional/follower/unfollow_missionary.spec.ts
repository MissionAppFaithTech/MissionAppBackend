import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import { loginTestUser } from '#tests/functional/follower/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

test.group('Follower - unfollow missionary', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('apoiador deixa de seguir um missionário que já segue', async ({ client }) => {
    const { user: supporter, password } = await createTestUser()
    const { user: missionary } = await createMissionaryTestUser()

    const accessToken = await loginTestUser(client, supporter.email, password)
    const url = router
      .builder()
      .params({ missionaryId: missionary.id })
      .make('v1.account.following.store')!

    await client.post(url).header('Authorization', `Bearer ${accessToken}`)

    const response = await client
      .delete(
        router
          .builder()
          .params({ missionaryId: missionary.id })
          .make('v1.account.following.destroy')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(204)
  })

  test('retorna 404 ao deixar de seguir quem não é seguido', async ({ client }) => {
    const { user: supporter, password } = await createTestUser()
    const { user: missionary } = await createMissionaryTestUser()

    const accessToken = await loginTestUser(client, supporter.email, password)

    const response = await client
      .delete(
        router
          .builder()
          .params({ missionaryId: missionary.id })
          .make('v1.account.following.destroy')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(404)
  })
})
