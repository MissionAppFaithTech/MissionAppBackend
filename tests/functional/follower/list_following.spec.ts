import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import { loginTestUser } from '#tests/functional/follower/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type FollowingPageBody = { data: unknown[] }

test.group('Follower - list following', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('lista os missionários seguidos pelo apoiador autenticado', async ({ client, assert }) => {
    const { user: supporter, password } = await createTestUser()
    const { user: missionaryOne } = await createMissionaryTestUser()
    const { user: missionaryTwo } = await createMissionaryTestUser()

    const accessToken = await loginTestUser(client, supporter.email, password)

    for (const missionary of [missionaryOne, missionaryTwo]) {
      await client
        .post(
          router
            .builder()
            .params({ missionaryId: missionary.id })
            .make('v1.account.following.store')!
        )
        .header('Authorization', `Bearer ${accessToken}`)
    }

    const response = await client
      .get(router.builder().make('v1.account.following.index')!)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf((response.body() as FollowingPageBody).data, 2)
  })

  test('retorna lista vazia quando o apoiador não segue ninguém', async ({ client, assert }) => {
    const { user: supporter, password } = await createTestUser()
    const accessToken = await loginTestUser(client, supporter.email, password)

    const response = await client
      .get(router.builder().make('v1.account.following.index')!)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf((response.body() as FollowingPageBody).data, 0)
  })
})
