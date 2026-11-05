import FaithCommunity from '#models/faith_community'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { v7 as uuidv7 } from 'uuid'

type ListBody = { data: Record<string, { id: string; name: string }[]>; meta: { hasMore: boolean } }
type ErrorBody = { errors: { field: string }[] }
type TokensBody = { data: { accessToken: string } }

type Catalog = {
  label: string
  routes: 'v1.missionary_agencies' | 'v1.faith_communities'
  listKey: string
  itemKey: string
  model: typeof MissionaryAgency | typeof FaithCommunity
}

const catalogs: Catalog[] = [
  {
    label: 'agências missionárias',
    routes: 'v1.missionary_agencies',
    listKey: 'missionaryAgencies',
    itemKey: 'missionaryAgency',
    model: MissionaryAgency,
  },
  {
    label: 'comunidades de fé',
    routes: 'v1.faith_communities',
    listKey: 'faithCommunities',
    itemKey: 'faithCommunity',
    model: FaithCommunity,
  },
]

/** Trecho que só os registros deste teste têm (letras, para não depender de dígitos). */
const marker = () =>
  uuidv7()
    .replaceAll('-', '')
    .slice(-10)
    .replace(/\d/g, (digit) => 'qrstuvwxyz'[Number(digit)])

async function seed(catalog: Catalog, names: string[], city?: string) {
  const { user } = await createTestUser()
  for (const name of names) await catalog.model.create({ name, city, userId: user.id })
}

test.group('Busca de catálogos (ADR-0041)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  const search = async (client: ApiClient, catalog: Catalog, qs: Record<string, string | number>) =>
    client
      .get(router.builder().make(`${catalog.routes}.index`)!)
      .qs(qs)
      .header('X-Forwarded-For', uniqueClientIp())

  test('encontra {label} ignorando acentos e maiúsculas')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Ação Missões São Paulo ${m}`])

      for (const term of [`acao missoes sao paulo ${m}`, `MISSÕES SÃO PAULO ${m.toUpperCase()}`]) {
        const response = await search(client, catalog, { search: term })
        response.assertStatus(200)
        assert.deepEqual(
          (response.body() as ListBody).data[catalog.listKey].map((item) => item.name),
          [`Ação Missões São Paulo ${m}`]
        )
      }
    })

  test('mostra primeiro em {label} quem começa com o termo')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`aaa ${m}`, `${m} bbb`])

      const response = await search(client, catalog, { search: m })
      assert.deepEqual(
        (response.body() as ListBody).data[catalog.listKey].map((item) => item.name),
        [`${m} bbb`, `aaa ${m}`]
      )
    })

  test('com 2 caracteres busca {label} pelo começo do nome')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Zq ${m}`, `Missão Zq ${m}`])

      const response = await search(client, catalog, { search: 'zq', limit: 20 })
      response.assertStatus(200)
      const names = (response.body() as ListBody).data[catalog.listKey].map((item) => item.name)
      assert.include(names, `Zq ${m}`)
      assert.notInclude(names, `Missão Zq ${m}`)
      for (const name of names) assert.match(name.toLowerCase(), /^zq/)
    })

  test('limita {label} e informa se há mais (hasMore)')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`${m} um`, `${m} dois`, `${m} três`])

      const page = await search(client, catalog, { search: m, limit: 2 })
      page.assertStatus(200)
      assert.lengthOf((page.body() as ListBody).data[catalog.listKey], 2)
      assert.isTrue((page.body() as ListBody).meta.hasMore)

      const all = await search(client, catalog, { search: m, limit: 3 })
      assert.lengthOf((all.body() as ListBody).data[catalog.listKey], 3)
      assert.isFalse((all.body() as ListBody).meta.hasMore)
    })

  test('responde lista vazia de {label} quando nada corresponde')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const response = await search(client, catalog, { search: `nada ${marker()}` })
      response.assertStatus(200)
      assert.deepEqual((response.body() as ListBody).data[catalog.listKey], [])
      assert.isFalse((response.body() as ListBody).meta.hasMore)
    })

  test('sem termo devolve só a primeira página de {label}, nunca a tabela inteira')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(
        catalog,
        Array.from({ length: 12 }, (_, index) => `${m} ${String(index).padStart(2, '0')}`)
      )

      const response = await search(client, catalog, {})
      response.assertStatus(200)
      assert.isAtMost((response.body() as ListBody).data[catalog.listKey].length, 10)
      assert.isTrue((response.body() as ListBody).meta.hasMore)
    })

  test('recusa termo de 1 caractere e limite acima de 20 em {label}')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const short = await search(client, catalog, { search: 'a' })
      short.assertStatus(422)
      assert.equal((short.body() as ErrorBody).errors[0].field, 'search')

      const tooMany = await search(client, catalog, { search: 'ab', limit: 21 })
      tooMany.assertStatus(422)
      assert.equal((tooMany.body() as ErrorBody).errors[0].field, 'limit')
    })
})

/**
 * Cadastros simultâneos do mesmo nome (com grafias diferentes) reaproveitam um
 * único registro: advisory lock + índice único `uq_<tabela>_name_normalized_city_normalized`.
 *
 * NOTE: sem `wrapInGlobalTransaction` — a transação global serializaria os
 * pedidos. Cada teste apaga o que criou.
 */
test.group('Busca de catálogos - deduplicação concorrente', (group) => {
  const userIds: string[] = []
  const created: { model: Catalog['model']; ids: string[] }[] = []

  group.each.teardown(async () => {
    for (const { model, ids } of created.splice(0)) {
      if (ids.length > 0) await model.query().whereIn('id', ids).delete()
    }
    if (userIds.length > 0) await User.query().whereIn('id', userIds.splice(0)).delete()
  })

  test('cadastros simultâneos de {label} com grafias diferentes viram um só')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const { user, password } = await createTestUser()
      userIds.push(user.id)
      const login = await client
        .post(router.builder().make('v1.auth.access_tokens.store')!)
        .json({ login: user.email, password })
      const accessToken = (login.body() as TokensBody).data.accessToken
      const m = marker()
      const spellings = [`Missão ${m}`, `MISSAO ${m.toUpperCase()}`, `  missão   ${m} `]

      const responses = await Promise.all(
        spellings.map((name) =>
          client
            .post(router.builder().make(`${catalog.routes}.store`)!)
            .header('Authorization', `Bearer ${accessToken}`)
            .json({ name, city: 'São Paulo' })
        )
      )

      for (const response of responses) response.assertStatus(200)
      const ids = new Set(
        responses.map(
          (response) =>
            (response.body() as { data: Record<string, { id: string }> }).data[catalog.itemKey].id
        )
      )
      created.push({ model: catalog.model, ids: [...ids] })
      assert.equal(ids.size, 1)
    })
})
