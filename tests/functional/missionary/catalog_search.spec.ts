import FaithCommunity from '#models/faith_community'
import MissionaryAgency from '#models/missionary_agency'
import User from '#models/user'
import { createTestUser } from '#tests/functional/auth/helpers'
import { uniqueClientIp } from '#tests/functional/missionary/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'
import { CATALOG_INDEXING_JOB_NAME } from '#constants/catalog_search'
import type { CatalogSearchKind } from '#constants/catalog_search'
import { searchIndexingQueue } from '#queues/search_indexing_queue'
import { CatalogSearchService } from '#services/search/catalog_search_service'
import type { ApiClient } from '@japa/api-client'
import { v7 as uuidv7 } from 'uuid'

type ListBody = { data: Record<string, { id: string; name: string }[]>; meta: { hasMore: boolean } }
type ErrorBody = { errors: { field: string }[] }
type TokensBody = { data: { accessToken: string } }

type Catalog = {
  label: string
  kind: CatalogSearchKind
  routes: 'v1.missionary_agencies' | 'v1.faith_communities'
  listKey: string
  itemKey: string
  model: typeof MissionaryAgency | typeof FaithCommunity
}

const catalogs: Catalog[] = [
  {
    label: 'agências missionárias',
    kind: 'missionary_agencies',
    routes: 'v1.missionary_agencies',
    listKey: 'missionaryAgencies',
    itemKey: 'missionaryAgency',
    model: MissionaryAgency,
  },
  {
    label: 'comunidades de fé',
    kind: 'faith_communities',
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

/** Cria os itens direto no banco e no índice de busca dos testes (`test_`). */
async function seed(catalog: Catalog, names: string[], city?: string) {
  const { user } = await createTestUser()
  const search = new CatalogSearchService(catalog.kind)
  for (const name of names) {
    await search.upsert(await catalog.model.create({ name, city, userId: user.id }))
  }
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

  const names = (response: { body(): unknown }, catalog: Catalog) =>
    (response.body() as ListBody).data[catalog.listKey].map((item) => item.name)

  test('acha {label} com palavras faltando e fora de ordem (ADR-0042)')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`JOCUM Brasil (Jovens Com Uma Missão) ${m}`])

      for (const term of [`jovens missao ${m}`, `${m} missão jovens`, `jocum ${m}`]) {
        const response = await search(client, catalog, { search: term })
        response.assertStatus(200)
        assert.deepEqual(names(response, catalog), [`JOCUM Brasil (Jovens Com Uma Missão) ${m}`])
      }
    })

  test('acha {label} com letras faltando, trocadas ou invertidas (ADR-0042)')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Igreja Batista da Lagoinha ${m}`])

      for (const term of [`jocun ${m}`, `igrja ${m}`, `batsita ${m}`, `lagoina ${m}`]) {
        const response = await search(client, catalog, { search: term })
        response.assertStatus(200)
        const expected = term.startsWith('jocun') ? [] : [`Igreja Batista da Lagoinha ${m}`]
        assert.deepEqual(names(response, catalog), expected, term)
      }
    })

  test('não traz {label} só parecido por acaso (ruído abaixo de 0,45)')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Junta de Missões Nacionais ${m}`])

      const response = await search(client, catalog, { search: `jocun ${m}` })
      response.assertStatus(200)
      assert.deepEqual(names(response, catalog), [])
    })

  test('mostra {label} exato antes do aproximado')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Missão Batsita ${m}`, `Missão Batista ${m}`, `Batista ${m}`])

      const response = await search(client, catalog, { search: `batista ${m}` })
      assert.deepEqual(names(response, catalog), [
        `Batista ${m}`,
        `Missão Batista ${m}`,
        `Missão Batsita ${m}`,
      ])
    })

  test('limita {label} aproximados e informa se há mais (hasMore)')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [
        `Igreja Batista ${m} um`,
        `Igreja Batista ${m} dois`,
        `Igreja Batista ${m} tres`,
      ])

      const page = await search(client, catalog, { search: `batsita ${m}`, limit: 2 })
      page.assertStatus(200)
      assert.lengthOf(names(page, catalog), 2)
      assert.isTrue((page.body() as ListBody).meta.hasMore)
    })

  test('considera só as 5 primeiras palavras do termo em {label}')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`${m} dois tres quatro cinco`])

      const response = await search(client, catalog, {
        search: `${m} dois tres quatro cinco ${marker()}`,
      })
      assert.deepEqual(names(response, catalog), [`${m} dois tres quatro cinco`])
    })

  test('combina a busca aproximada de {label} com o filtro de cidade')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Igreja Batista ${m}`], 'Niterói')
      await seed(catalog, [`Igreja Batista ${m} Centro`], 'Recife')

      const response = await search(client, catalog, { search: `batsita ${m}`, city: 'niteroi' })
      assert.deepEqual(names(response, catalog), [`Igreja Batista ${m}`])
    })

  test('com o Elasticsearch fora do ar, busca {label} no PostgreSQL com o mesmo resultado')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const m = marker()
      await seed(catalog, [`Igreja Batista da Lagoinha ${m}`])
      const original = CatalogSearchService.prototype.searchIds
      CatalogSearchService.prototype.searchIds = async () => {
        throw new Error('Elasticsearch indisponível')
      }
      try {
        const response = await search(client, catalog, { search: `batsita ${m}` })
        response.assertStatus(200)
        assert.deepEqual(names(response, catalog), [`Igreja Batista da Lagoinha ${m}`])
      } finally {
        CatalogSearchService.prototype.searchIds = original
      }
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

/**
 * Criar, renomear e remover pela API leva a mudança ao índice logo depois do
 * commit (ADR-0042): a próxima busca já reflete o banco.
 */
test.group('Busca de catálogos - índice acompanha o banco (ADR-0042)', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  const login = async (client: ApiClient) => {
    const { user, password } = await createTestUser()
    const response = await client
      .post(router.builder().make('v1.auth.access_tokens.store')!)
      .json({ login: user.email, password })
    return (response.body() as TokensBody).data.accessToken
  }
  const searchNames = async (client: ApiClient, catalog: Catalog, term: string) => {
    const response = await client
      .get(router.builder().make(`${catalog.routes}.index`)!)
      .qs({ search: term })
      .header('X-Forwarded-For', uniqueClientIp())
    return (response.body() as ListBody).data[catalog.listKey].map((item) => item.name)
  }

  test('{label} criado, renomeado e removido pela API aparece e some da busca')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const token = await login(client)
      const m = marker()

      const created = await client
        .post(router.builder().make(`${catalog.routes}.store`)!)
        .header('Authorization', `Bearer ${token}`)
        .json({ name: `Comunidade Esperança ${m}` })
      created.assertStatus(200)
      const id = (created.body() as { data: Record<string, { id: string }> }).data[catalog.itemKey]
        .id
      assert.deepEqual(await searchNames(client, catalog, `esperanca ${m}`), [
        `Comunidade Esperança ${m}`,
      ])

      const renamed = await client
        .patch(router.builder().params({ id }).make(`${catalog.routes}.update`)!)
        .header('Authorization', `Bearer ${token}`)
        .json({ name: `Comunidade Renovação ${m}` })
      renamed.assertStatus(200)
      assert.deepEqual(await searchNames(client, catalog, `renovacao ${m}`), [
        `Comunidade Renovação ${m}`,
      ])

      const removed = await client
        .delete(router.builder().params({ id }).make(`${catalog.routes}.destroy`)!)
        .header('Authorization', `Bearer ${token}`)
      removed.assertStatus(200)
      assert.deepEqual(await searchNames(client, catalog, `renovacao ${m}`), [])
    })

  test('se o índice falhar, {label} é criado mesmo assim e a reindexação vai para a fila')
    .with(catalogs)
    .run(async ({ client, assert }, catalog) => {
      const token = await login(client)
      const original = CatalogSearchService.prototype.upsert
      CatalogSearchService.prototype.upsert = async () => {
        throw new Error('Elasticsearch indisponível')
      }
      try {
        const created = await client
          .post(router.builder().make(`${catalog.routes}.store`)!)
          .header('Authorization', `Bearer ${token}`)
          .json({ name: `Comunidade Fila ${marker()}` })
        created.assertStatus(200)
        const id = (created.body() as { data: Record<string, { id: string }> }).data[
          catalog.itemKey
        ].id

        const jobs = await searchIndexingQueue.getJobs(['waiting', 'delayed', 'active'])
        const retry = jobs.find(
          (job) =>
            job.name === CATALOG_INDEXING_JOB_NAME && 'kind' in job.data && job.data.id === id
        )
        assert.deepEqual(retry?.data, { kind: catalog.kind, id })
        await retry?.remove()
      } finally {
        CatalogSearchService.prototype.upsert = original
      }
    })
})
