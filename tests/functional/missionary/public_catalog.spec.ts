import { createTestUser } from '#tests/functional/auth/helpers'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'
import FaithCommunity from '#models/faith_community'
import MissionaryAgency from '#models/missionary_agency'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

type ApiBody = { data: Record<string, any> }

type CatalogEntryAttributes = { name: string; phoneNumber: string; userId: string }

type Catalog = {
  label: string
  routes: 'v1.missionary_agencies' | 'v1.faith_communities'
  listKey: string
  itemKey: string
  create: (attributes: CatalogEntryAttributes) => Promise<MissionaryAgency | FaithCommunity>
}

const catalogs: Catalog[] = [
  {
    label: 'agências missionárias',
    routes: 'v1.missionary_agencies',
    listKey: 'missionaryAgencies',
    itemKey: 'missionaryAgency',
    create: (attributes) => MissionaryAgency.create(attributes),
  },
  {
    label: 'comunidades de fé',
    routes: 'v1.faith_communities',
    listKey: 'faithCommunities',
    itemKey: 'faithCommunity',
    create: (attributes) => FaithCommunity.create(attributes),
  },
]

const RATE_LIMIT_MAX_REQUESTS = 20

async function createCatalogEntry(catalog: Catalog, name: string) {
  const { user } = await createTestUser()
  return catalog.create({ name, phoneNumber: '+5511912345678', userId: user.id })
}

test.group('Catálogo público - agências missionárias e comunidades de fé', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  test('lista {label} sem autenticação aplicando o filtro search')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const marker = uuidv7().replaceAll('-', '').slice(-12)
      await createCatalogEntry(catalog, `Alvo ${marker}`)
      await createCatalogEntry(catalog, `Outro ${uuidv7()}`)

      const response = await client
        .get(router.builder().make(`${catalog.routes}.index`)!)
        .qs({ search: marker })
        .header('X-Forwarded-For', uniqueClientIp())

      response.assertStatus(200)
      const items = (response.body() as ApiBody).data[catalog.listKey] as Record<string, unknown>[]
      assert.deepEqual(
        items.map((item) => item.name),
        [`Alvo ${marker}`]
      )
      assert.notProperty(items[0], 'userId')
    })

  test('detalha {label} sem autenticação e sem expor o criador')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const entry = await createCatalogEntry(catalog, `Detalhe ${uuidv7()}`)

      const response = await client
        .get(router.builder().params({ id: entry.id }).make(`${catalog.routes}.show`)!)
        .header('X-Forwarded-For', uniqueClientIp())

      response.assertStatus(200)
      const item = (response.body() as ApiBody).data[catalog.itemKey] as Record<string, unknown>
      assert.equal(item.id, entry.id)
      assert.notProperty(item, 'userId')
    })

  test('mantém criação, atualização e remoção de {label} protegidas por auth')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const entry = await createCatalogEntry(catalog, `Protegida ${uuidv7()}`)

      const store = await client
        .post(router.builder().make(`${catalog.routes}.store`)!)
        .json({ name: 'Sem auth' })
      const update = await client
        .patch(router.builder().params({ id: entry.id }).make(`${catalog.routes}.update`)!)
        .json({ name: 'Sem auth' })
      const destroy = await client.delete(
        router.builder().params({ id: entry.id }).make(`${catalog.routes}.destroy`)!
      )

      store.assertStatus(401)
      update.assertStatus(401)
      destroy.assertStatus(401)

      await entry.refresh()
      assert.notEqual(entry.name, 'Sem auth')
    })

  test('limita a listagem de {label} por IP e devolve 429 com Retry-After')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const url = router.builder().make(`${catalog.routes}.index`)!
      const clientIp = uniqueClientIp()

      for (let attempt = 1; attempt <= RATE_LIMIT_MAX_REQUESTS; attempt++) {
        const response = await client.get(url).header('X-Forwarded-For', clientIp)
        response.assertStatus(200)
      }

      const limited = await client.get(url).header('X-Forwarded-For', clientIp)
      limited.assertStatus(429)
      assert.equal(limited.header('retry-after'), '60')

      const otherIp = await client.get(url).header('X-Forwarded-For', uniqueClientIp())
      otherIp.assertStatus(200)
    })

  test('conta o limite de cada catálogo separadamente', async ({ client }) => {
    const clientIp = uniqueClientIp()
    const agenciesUrl = router.builder().make('v1.missionary_agencies.index')!

    for (let attempt = 1; attempt <= RATE_LIMIT_MAX_REQUESTS + 1; attempt++) {
      await client.get(agenciesUrl).header('X-Forwarded-For', clientIp)
    }

    const communities = await client
      .get(router.builder().make('v1.faith_communities.index')!)
      .header('X-Forwarded-For', clientIp)

    communities.assertStatus(200)
  })
})
