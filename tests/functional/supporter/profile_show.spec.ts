import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type SupporterProfileBody = { data: { username: string } }

test.group('Supporter - public profile show', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('retorna o perfil público de um apoiador sem autenticação', async ({ client, assert }) => {
    const { user: supporter } = await createTestUser()

    const response = await client.get(
      router.builder().params({ username: supporter.username }).make('v1.supporter.profile.show')!
    )

    response.assertStatus(200)
    assert.equal(
      (response.body() as unknown as SupporterProfileBody).data.username,
      supporter.username
    )
    assert.notProperty((response.body() as unknown as SupporterProfileBody).data, 'email')
  })

  test('retorna 404 para username inexistente', async ({ client }) => {
    const response = await client.get(
      router
        .builder()
        .params({ username: 'usuario_inexistente' })
        .make('v1.supporter.profile.show')!
    )

    response.assertStatus(404)
  })

  test('retorna 404 para um username que pertence a um missionário', async ({ client }) => {
    const { user: missionary } = await createMissionaryTestUser()

    const response = await client.get(
      router.builder().params({ username: missionary.username }).make('v1.supporter.profile.show')!
    )

    response.assertStatus(404)
  })
})
