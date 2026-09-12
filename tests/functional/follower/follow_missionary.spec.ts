import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import { loginTestUser } from '#tests/functional/follower/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type FollowerBody = { data: { id: string; createdAt: string; missionary: { id: string } } }

test.group('Follower - follow missionary', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('apoiador passa a seguir um missionário', async ({ client, assert }) => {
    const { user: supporter, password } = await createTestUser()
    const { user: missionary } = await createMissionaryTestUser()

    const accessToken = await loginTestUser(client, supporter.email, password)

    const response = await client
      .post(
        router.builder().params({ missionaryId: missionary.id }).make('v1.account.following.store')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal((response.body() as unknown as FollowerBody).data.missionary.id, missionary.id)
  })

  test('não permite seguir o mesmo missionário duas vezes', async ({ client }) => {
    const { user: supporter, password } = await createTestUser()
    const { user: missionary } = await createMissionaryTestUser()

    const accessToken = await loginTestUser(client, supporter.email, password)
    const url = router
      .builder()
      .params({ missionaryId: missionary.id })
      .make('v1.account.following.store')!

    await client.post(url).header('Authorization', `Bearer ${accessToken}`)
    const response = await client.post(url).header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(409)
  })

  test('não permite apoiador seguir outro apoiador', async ({ client }) => {
    const { user: supporter, password } = await createTestUser()
    const { user: otherSupporter } = await createTestUser()

    const accessToken = await loginTestUser(client, supporter.email, password)

    const response = await client
      .post(
        router
          .builder()
          .params({ missionaryId: otherSupporter.id })
          .make('v1.account.following.store')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(404)
  })

  test('não permite missionário seguir outro missionário por esta rota', async ({ client }) => {
    const { user: actorMissionary, password } = await createMissionaryTestUser()
    const { user: targetMissionary } = await createMissionaryTestUser()

    const accessToken = await loginTestUser(client, actorMissionary.email, password)

    const response = await client
      .post(
        router
          .builder()
          .params({ missionaryId: targetMissionary.id })
          .make('v1.account.following.store')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(403)
  })

  test('retorna 404 para missionário inexistente', async ({ client }) => {
    const { user: supporter, password } = await createTestUser()
    const accessToken = await loginTestUser(client, supporter.email, password)

    const response = await client
      .post(
        router
          .builder()
          .params({ missionaryId: '018f1e4a-5c1a-7c3a-8b2a-000000000000' })
          .make('v1.account.following.store')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(404)
  })
})
