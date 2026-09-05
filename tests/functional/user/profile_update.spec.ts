import { createTestUser } from '#tests/functional/auth/helpers'
import FaithCommunity from '#models/faith_community'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type ProfileBody = { data: { user: { faithCommunityId: string | null } } }

test.group('User - profile update', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('atualiza dados básicos do perfil autenticado', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        fullName: 'Novo Nome',
        username: 'novo_username',
        biography: 'Biografia atualizada',
      })

    response.assertStatus(200)
  })

  test('atualiza a comunidade de fé do perfil autenticado', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const faithCommunity = await FaithCommunity.create({ name: 'Igreja Teste' })

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: faithCommunity.id })

    response.assertStatus(200)
    assert.equal(
      (response.body() as unknown as ProfileBody).data.user.faithCommunityId,
      faithCommunity.id
    )
  })

  test('rejeita comunidade de fé inexistente', async ({ client }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: '018f1e4a-5c1a-7c3a-8b2a-000000000000' })

    response.assertStatus(422)
  })
})
