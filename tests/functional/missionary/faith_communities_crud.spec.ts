import { createTestUser } from '#tests/functional/auth/helpers'
import { UserRole } from '#enums/user/user_role'
import FaithCommunity from '#models/faith_community'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

type TokensBody = { data: { accessToken: string } }
type ApiBody = { data: Record<string, any> }

async function loginAndGetAccessToken(
  login: string,
  password: string,
  client: any
): Promise<string> {
  const response = await client
    .post(router.builder().make('v1.auth.access_tokens.store')!)
    .json({ login, password })

  return (response.body() as TokensBody).data.accessToken
}

test.group('Faith communities - CRUD', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria, lista, detalha, atualiza e remove comunidade de fé', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Igreja Renovada', phoneNumber: '+5511933344455' })

    store.assertStatus(200)
    const storedCommunityId = (store.body() as ApiBody).data.faithCommunity.id as string

    const index = await client
      .get(router.builder().make('v1.faith_communities.index')!)
      .header('Authorization', `Bearer ${accessToken}`)

    index.assertStatus(200)
    assert.isArray((index.body() as ApiBody).data.faithCommunities)

    const show = await client
      .get(router.builder().params({ id: storedCommunityId }).make('v1.faith_communities.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    show.assertStatus(200)
    assert.equal((show.body() as ApiBody).data.faithCommunity.id, storedCommunityId)

    const update = await client
      .patch(
        router.builder().params({ id: storedCommunityId }).make('v1.faith_communities.update')!
      )
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Igreja Renovada Central' })

    update.assertStatus(200)
    assert.equal((update.body() as ApiBody).data.faithCommunity.name, 'Igreja Renovada Central')

    const destroy = await client
      .delete(
        router.builder().params({ id: storedCommunityId }).make('v1.faith_communities.destroy')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    destroy.assertStatus(200)

    const deletedCommunity = await FaithCommunity.find(storedCommunityId)
    assert.isNull(deletedCommunity)
  })

  test('retorna 403 quando usuário não-admin tenta remover comunidade de outro usuário', async ({
    client,
  }) => {
    const { user: owner, password: ownerPassword } = await createTestUser()
    const ownerToken = await loginAndGetAccessToken(owner.email, ownerPassword, client)

    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ name: 'Comunidade Restrita', phoneNumber: '+5511911112233' })

    const communityId = (store.body() as ApiBody).data.faithCommunity.id as string

    const { user: anotherUser, password: anotherPassword } = await createTestUser()
    const anotherToken = await loginAndGetAccessToken(anotherUser.email, anotherPassword, client)

    const destroy = await client
      .delete(router.builder().params({ id: communityId }).make('v1.faith_communities.destroy')!)
      .header('Authorization', `Bearer ${anotherToken}`)

    destroy.assertStatus(403)
  })

  test('permite remoção por ADMIN mesmo sem ser dono', async ({ client }) => {
    const { user: owner, password: ownerPassword } = await createTestUser()
    const ownerToken = await loginAndGetAccessToken(owner.email, ownerPassword, client)

    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ name: 'Comunidade Admin', phoneNumber: '+5511955566677' })

    const communityId = (store.body() as ApiBody).data.faithCommunity.id as string

    const { user: admin, password: adminPassword } = await createTestUser()
    admin.role = UserRole.ADMIN
    await admin.save()

    const adminToken = await loginAndGetAccessToken(admin.email, adminPassword, client)

    const destroy = await client
      .delete(router.builder().params({ id: communityId }).make('v1.faith_communities.destroy')!)
      .header('Authorization', `Bearer ${adminToken}`)

    destroy.assertStatus(200)
  })

  test('filtra listagem por nome e localidade', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const url = router.builder().make('v1.faith_communities.index')!

    for (const body of [
      { name: 'Alfa Central', city: 'São Paulo', state: 'SP', country: 'Brasil' },
      { name: 'Beta Norte', city: 'Manaus', state: 'AM', country: 'Brasil' },
      { name: 'Gamma 100%', city: 'Lisboa', country: 'Portugal' },
    ]) {
      const created = await client
        .post(router.builder().make('v1.faith_communities.store')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ phoneNumber: '+5511933344455', ...body })
      created.assertStatus(200)
    }

    const names = async (qs: Record<string, string>) => {
      const res = await client.get(url).qs(qs).header('Authorization', `Bearer ${accessToken}`)
      res.assertStatus(200)
      return ((res.body() as ApiBody).data.faithCommunities as { name: string }[]).map(
        (item) => item.name
      )
    }

    assert.deepEqual(await names({ search: 'alfa' }), ['Alfa Central'])
    assert.deepEqual(await names({ city: 'manaus' }), ['Beta Norte'])
    assert.deepEqual(await names({ state: 'sp' }), ['Alfa Central'])
    assert.deepEqual(await names({ country: 'Brasil' }), ['Alfa Central', 'Beta Norte'])
    assert.deepEqual(await names({ country: 'brasil', search: 'norte' }), ['Beta Norte'])
    assert.deepEqual(await names({ search: '100%' }), ['Gamma 100%'])
    assert.deepEqual(await names({ search: '%' }), ['Gamma 100%'])
  })
})
