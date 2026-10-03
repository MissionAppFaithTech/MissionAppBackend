import { createTestUser } from '#tests/functional/auth/helpers'
import MissionaryAgency from '#models/missionary_agency'
import { UserRole } from '#enums/user/user_role'
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

test.group('Missionary agencies - CRUD', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('cria, lista, detalha, atualiza e remove agência missionária', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const store = await client
      .post(router.builder().make('v1.missionary_agencies.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Agência Esperança', phoneNumber: '+5511912345678' })

    store.assertStatus(200)
    const storedAgencyId = (store.body() as ApiBody).data.missionaryAgency.id as string

    const index = await client
      .get(router.builder().make('v1.missionary_agencies.index')!)
      .header('Authorization', `Bearer ${accessToken}`)

    index.assertStatus(200)
    assert.isArray((index.body() as ApiBody).data.missionaryAgencies)

    const show = await client
      .get(router.builder().params({ id: storedAgencyId }).make('v1.missionary_agencies.show')!)
      .header('Authorization', `Bearer ${accessToken}`)

    show.assertStatus(200)
    assert.equal((show.body() as ApiBody).data.missionaryAgency.id, storedAgencyId)

    const update = await client
      .patch(router.builder().params({ id: storedAgencyId }).make('v1.missionary_agencies.update')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Agência Esperança Brasil' })

    update.assertStatus(200)
    assert.equal((update.body() as ApiBody).data.missionaryAgency.name, 'Agência Esperança Brasil')

    const destroy = await client
      .delete(
        router.builder().params({ id: storedAgencyId }).make('v1.missionary_agencies.destroy')!
      )
      .header('Authorization', `Bearer ${accessToken}`)

    destroy.assertStatus(200)

    const deletedAgency = await MissionaryAgency.find(storedAgencyId)
    assert.isNull(deletedAgency)
  })

  test('retorna 403 quando usuário não-admin tenta atualizar agência de outro usuário', async ({
    client,
  }) => {
    const { user: owner, password: ownerPassword } = await createTestUser()
    const ownerToken = await loginAndGetAccessToken(owner.email, ownerPassword, client)

    const store = await client
      .post(router.builder().make('v1.missionary_agencies.store')!)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ name: 'Agência Restrita' })

    const agencyId = (store.body() as ApiBody).data.missionaryAgency.id as string

    const { user: anotherUser, password: anotherPassword } = await createTestUser()
    const anotherToken = await loginAndGetAccessToken(anotherUser.email, anotherPassword, client)

    const update = await client
      .patch(router.builder().params({ id: agencyId }).make('v1.missionary_agencies.update')!)
      .header('Authorization', `Bearer ${anotherToken}`)
      .json({ name: 'Tentativa Indevida' })

    update.assertStatus(403)
  })

  test('permite atualização por ADMIN mesmo sem ser dono', async ({ client }) => {
    const { user: owner, password: ownerPassword } = await createTestUser()
    const ownerToken = await loginAndGetAccessToken(owner.email, ownerPassword, client)

    const store = await client
      .post(router.builder().make('v1.missionary_agencies.store')!)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ name: 'Agência Admin' })

    const agencyId = (store.body() as ApiBody).data.missionaryAgency.id as string

    const { user: admin, password: adminPassword } = await createTestUser()
    admin.role = UserRole.ADMIN
    await admin.save()

    const adminToken = await loginAndGetAccessToken(admin.email, adminPassword, client)

    const update = await client
      .patch(router.builder().params({ id: agencyId }).make('v1.missionary_agencies.update')!)
      .header('Authorization', `Bearer ${adminToken}`)
      .json({ name: 'Agência Atualizada pelo Admin' })

    update.assertStatus(200)
  })

  test('filtra listagem por nome e localidade', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const url = router.builder().make('v1.missionary_agencies.index')!

    for (const body of [
      { name: 'Alfa Central', city: 'São Paulo', state: 'SP', country: 'Brasil' },
      { name: 'Beta Norte', city: 'Manaus', state: 'AM', country: 'Brasil' },
      { name: 'Gamma 100%', city: 'Lisboa', country: 'Portugal' },
    ]) {
      const created = await client
        .post(router.builder().make('v1.missionary_agencies.store')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json({ phoneNumber: '+5511933344455', ...body })
      created.assertStatus(200)
    }

    const names = async (qs: Record<string, string>) => {
      const res = await client.get(url).qs(qs).header('Authorization', `Bearer ${accessToken}`)
      res.assertStatus(200)
      return ((res.body() as ApiBody).data.missionaryAgencies as { name: string }[]).map(
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
