import { createTestUser } from '#tests/functional/auth/helpers'
import { UserRole } from '#enums/user/user_role'
import FaithCommunity from '#models/faith_community'
import Pastor from '#models/pastor'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'

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
    const clientIp = uniqueClientIp()

    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Igreja Renovada', phoneNumber: '+5511933344455' })

    store.assertStatus(200)
    const storedCommunityId = (store.body() as ApiBody).data.faithCommunity.id as string

    const index = await client
      .get(router.builder().make('v1.faith_communities.index')!)
      .header('X-Forwarded-For', clientIp)
      .header('Authorization', `Bearer ${accessToken}`)

    index.assertStatus(200)
    assert.isArray((index.body() as ApiBody).data.faithCommunities)

    const show = await client
      .get(router.builder().params({ id: storedCommunityId }).make('v1.faith_communities.show')!)
      .header('X-Forwarded-For', clientIp)
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
    const clientIp = uniqueClientIp()

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

    const createdNames = new Set(['Alfa Central', 'Beta Norte', 'Gamma 100%'])
    const names = async (qs: Record<string, string>) => {
      const res = await client
        .get(url)
        .qs(qs)
        .header('X-Forwarded-For', clientIp)
        .header('Authorization', `Bearer ${accessToken}`)
      res.assertStatus(200)
      // NOTE: o banco local pode ter outros registros (seed); só os criados aqui importam
      return ((res.body() as ApiBody).data.faithCommunities as { name: string }[])
        .map((item) => item.name)
        .filter((name) => createdNames.has(name))
    }

    assert.deepEqual(await names({ search: 'alfa' }), ['Alfa Central'])
    assert.deepEqual(await names({ city: 'manaus' }), ['Beta Norte'])
    assert.deepEqual(await names({ state: 'sp' }), ['Alfa Central'])
    assert.deepEqual(await names({ country: 'Brasil' }), ['Alfa Central', 'Beta Norte'])
    assert.deepEqual(await names({ country: 'brasil', search: 'norte' }), ['Beta Norte'])
    assert.deepEqual(await names({ search: '100%' }), ['Gamma 100%'])
    assert.deepEqual(await names({ search: '%' }), ['Gamma 100%'])
  })

  test('reaproveita a comunidade com mesmo nome e cidade, ignorando acentos e maiúsculas', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const store = (payload: Record<string, string>) =>
      client
        .post(router.builder().make('v1.faith_communities.store')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json(payload)

    const first = await store({ name: 'Igreja Muito Abençoada', city: 'Niterói' })
    const again = await store({ name: '  igreja  muito abencoada ', city: 'NITEROI' })
    const otherCity = await store({ name: 'Igreja Muito Abençoada', city: 'Maricá' })

    first.assertStatus(200)
    again.assertStatus(200)
    otherCity.assertStatus(200)
    const idOf = (response: typeof first) =>
      (response.body() as ApiBody).data.faithCommunity.id as string

    assert.equal(idOf(again), idOf(first))
    assert.notEqual(idOf(otherCity), idOf(first))
    const rows = await FaithCommunity.query().where('user_id', user.id)
    assert.lengthOf(rows, 2)
  })

  test('grava e expõe o pastor com campos planos', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Igreja do Pastor',
        city: 'Recife',
        pastorName: 'João Batista',
        pastorPhone: '+5581912345678',
      })

    store.assertStatus(200)
    const created = (store.body() as ApiBody).data.faithCommunity
    assert.equal(created.pastorName, 'João Batista')
    assert.equal(created.pastorPhone, '+5581912345678')

    const show = await client
      .get(router.builder().params({ id: created.id }).make('v1.faith_communities.show')!)
      .header('X-Forwarded-For', uniqueClientIp())

    show.assertStatus(200)
    assert.equal((show.body() as ApiBody).data.faithCommunity.pastorName, 'João Batista')

    const index = await client
      .get(router.builder().make('v1.faith_communities.index')!)
      .qs({ search: 'Igreja do Pastor' })
      .header('X-Forwarded-For', uniqueClientIp())

    index.assertStatus(200)
    const listed = ((index.body() as ApiBody).data.faithCommunities as any[]).find(
      (item) => item.id === created.id
    )
    assert.equal(listed.pastorPhone, '+5581912345678')
  })

  test('atualiza, limpa o telefone e remove o pastor', async ({ client, assert }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)
    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Igreja Sem Pastor', city: 'Natal' })

    store.assertStatus(200)
    const id = (store.body() as ApiBody).data.faithCommunity.id as string
    assert.isNull((store.body() as ApiBody).data.faithCommunity.pastorName)
    const patch = (body: Record<string, unknown>) =>
      client
        .patch(router.builder().params({ id }).make('v1.faith_communities.update')!)
        .header('Authorization', `Bearer ${accessToken}`)
        .json(body)

    const phoneOnly = await patch({ pastorPhone: '+5584911112222' })
    phoneOnly.assertStatus(422)
    assert.equal((phoneOnly.body() as any).errors[0].field, 'pastorName')

    const added = await patch({ pastorName: 'Maria', pastorPhone: '+5584911112222' })
    added.assertStatus(200)
    assert.equal((added.body() as ApiBody).data.faithCommunity.pastorName, 'Maria')

    const renamed = await patch({ pastorName: 'Maria Souza', pastorPhone: null })
    renamed.assertStatus(200)
    assert.equal((renamed.body() as ApiBody).data.faithCommunity.pastorName, 'Maria Souza')
    assert.isNull((renamed.body() as ApiBody).data.faithCommunity.pastorPhone)
    assert.lengthOf(await Pastor.query().where('faith_community_id', id), 1)

    const untouched = await patch({ name: 'Igreja Com Pastor' })
    untouched.assertStatus(200)
    assert.equal((untouched.body() as ApiBody).data.faithCommunity.pastorName, 'Maria Souza')

    const removed = await patch({ pastorName: null })
    removed.assertStatus(200)
    assert.isNull((removed.body() as ApiBody).data.faithCommunity.pastorName)
    assert.lengthOf(await Pastor.query().where('faith_community_id', id), 0)
  })

  test('exige o nome do pastor quando o telefone é enviado na criação', async ({
    client,
    assert,
  }) => {
    const { user, password } = await createTestUser()
    const accessToken = await loginAndGetAccessToken(user.email, password, client)

    const store = await client
      .post(router.builder().make('v1.faith_communities.store')!)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Igreja Incompleta', pastorPhone: '+5581912345678' })

    store.assertStatus(422)
    assert.equal((store.body() as any).errors[0].field, 'pastorName')
  })
})
