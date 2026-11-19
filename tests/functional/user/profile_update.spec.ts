import FaithCommunity from '#models/faith_community'
import Missionary from '#models/missionary'
import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type UserBody = { data: { user: Record<string, unknown> } }

const clearValues = [
  { label: 'null', value: null },
  { label: 'string vazia', value: '' },
]

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

  test('limpa a biografia ao enviar {label} e mantém os campos omitidos')
    .with(clearValues)
    .run(async ({ client, assert }, { value }) => {
      const { user, password } = await createTestUser()
      user.biography = 'Biografia original'
      await user.save()

      const login = await client
        .post(router.builder().make('v1.auth.access_tokens.store')!)
        .json({ login: user.email, password })

      const accessToken = (login.body() as TokensBody).data.accessToken

      const response = await client
        .patch(router.builder().make('v1.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ biography: value })

      response.assertStatus(200)
      const body = (response.body() as UserBody).data.user
      const persisted = await User.findOrFail(user.id)

      assert.isNull(persisted.biography)
      assert.isNull(body.biography)
      assert.equal(persisted.fullName, user.fullName)
      assert.equal(persisted.username, user.username)
      assert.equal(body.fullName, user.fullName)
      assert.equal(body.username, user.username)
    })

  test('ignora null em {$self}, que não pode ser limpo')
    .with(['fullName', 'username'] as const)
    .run(async ({ client, assert }, field) => {
      const { user, password } = await createTestUser()

      const login = await client
        .post(router.builder().make('v1.auth.access_tokens.store')!)
        .json({ login: user.email, password })

      const accessToken = (login.body() as TokensBody).data.accessToken

      const response = await client
        .patch(router.builder().make('v1.profile.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ [field]: null })

      response.assertStatus(200)
      const body = (response.body() as UserBody).data.user
      const persisted = await User.findOrFail(user.id)
      assert.equal(persisted[field], user[field])
      assert.equal(body[field], user[field])
    })

  test('vincula e desvincula comunidade de fé pelo perfil da conta', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const community = await FaithCommunity.create({
      name: 'Igreja Batista Central',
      phoneNumber: '+5511933344455',
      userId: user.id,
    })

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const linked = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: community.id })

    linked.assertStatus(200)
    const afterLink = await User.findOrFail(user.id)
    assert.equal(afterLink.faithCommunityId, community.id)

    const unlinked = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: null })

    unlinked.assertStatus(200)
    const afterUnlink = await User.findOrFail(user.id)
    assert.isNull(afterUnlink.faithCommunityId)
  })

  test('rejeita faithCommunityId que não existe no banco com 422', async ({ client, assert }) => {
    const { user, password } = await createTestUser()

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: '019a0000-0000-7000-9000-00000000ffff' })

    response.assertStatus(422)
    assert.equal((response.body() as any).errors[0].field, 'faithCommunityId')
    assert.equal((response.body() as any).errors[0].rule, 'database.exists')
  })

  test('sincroniza faithCommunityId no registro de missionário ao atualizar pelo perfil da conta', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary } = await createMissionaryTestUser()
    const community = await FaithCommunity.create({
      name: 'Igreja Sincronizada',
      phoneNumber: '+5511933344455',
      userId: user.id,
    })

    const login = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })

    const accessToken = (login.body() as TokensBody).data.accessToken

    const response = await client
      .patch(router.builder().make('v1.profile.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ faithCommunityId: community.id })

    response.assertStatus(200)
    const persistedUser = await User.findOrFail(user.id)
    const persistedMissionary = await Missionary.findOrFail(missionary.id)
    assert.equal(persistedUser.faithCommunityId, community.id)
    assert.equal(persistedMissionary.faithCommunityId, community.id)
  })
})
