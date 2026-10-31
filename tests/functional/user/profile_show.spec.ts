import FaithCommunity from '#models/faith_community'
import { createTestUser } from '#tests/functional/auth/helpers'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

type TokensBody = { data: { accessToken: string } }
type ProfileBody = {
  data: {
    missionary: Record<string, unknown> | null
    missionaryAgency: Record<string, unknown> | null
    faithCommunity: Record<string, unknown> | null
  }
}

async function showProfile(client: ApiClient, email: string, password: string) {
  const login = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login: email, password })
  const accessToken = (login.body() as TokensBody).data.accessToken

  return client
    .get(router.builder().make('v1.profile.show')!)
    .header('Authorization', `Bearer ${accessToken}`)
}

test.group('User - profile show', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('inclui id e nome da agência e da comunidade de fé do missionário', async ({
    client,
    assert,
  }) => {
    const { user, password, missionary, agency } = await createMissionaryTestUser()
    const community = await FaithCommunity.create({
      name: 'Comunidade Teste',
      phoneNumber: '+5511933344455',
      userId: user.id,
    })
    missionary.faithCommunityId = community.id
    await missionary.save()

    const response = await showProfile(client, user.email, password)

    response.assertStatus(200)
    const body = response.body() as ProfileBody
    assert.deepEqual(body.data.missionaryAgency, { id: agency.id, name: 'Agência Teste' })
    assert.deepEqual(body.data.faithCommunity, { id: community.id, name: 'Comunidade Teste' })
  })

  test('retorna faithCommunity nulo quando o missionário não tem comunidade', async ({
    client,
    assert,
  }) => {
    const { user, password, agency } = await createMissionaryTestUser()

    const response = await showProfile(client, user.email, password)

    response.assertStatus(200)
    const body = response.body() as ProfileBody
    assert.deepEqual(body.data.missionaryAgency, { id: agency.id, name: 'Agência Teste' })
    assert.isNull(body.data.faithCommunity)
  })

  test('retorna referências de catálogo nulas para usuário sem perfil missionário', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()

    const response = await showProfile(client, user.email, password)

    response.assertStatus(200)
    const body = response.body() as ProfileBody
    assert.isNull(body.data.missionary)
    assert.isNull(body.data.missionaryAgency)
    assert.isNull(body.data.faithCommunity)
  })
})
