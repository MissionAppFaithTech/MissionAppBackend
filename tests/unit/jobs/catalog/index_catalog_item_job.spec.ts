import { indexCatalogItem } from '#jobs/catalog/index_catalog_item_job'
import FaithCommunity from '#models/faith_community'
import { CatalogSearchService } from '#services/search/catalog_search_service'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { v7 as uuidv7 } from 'uuid'

const word = () =>
  uuidv7()
    .replaceAll('-', '')
    .slice(-10)
    .replace(/\d/g, (digit) => 'qrstuvwxyz'[Number(digit)])

test.group('indexCatalogItem (job)', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())
  // NOTE: cada escrita espera o refresh do índice (`refresh: wait_for`, até ~1 s)
  group.each.timeout(10_000)

  test('indexa o item que existe no banco', async ({ assert }) => {
    const m = word()
    const community = await FaithCommunity.create({ name: `Comunidade Reserva ${m}` })

    await indexCatalogItem({ kind: 'faith_communities', id: community.id })

    const ids = await new CatalogSearchService('faith_communities').searchIds(`reserva ${m}`, {}, 5)
    assert.deepEqual(ids, [community.id])
  })

  test('remove do índice o item que não existe mais', async ({ assert }) => {
    const m = word()
    const search = new CatalogSearchService('faith_communities')
    const id = uuidv7()
    await search.upsert({
      id,
      name: `Comunidade Removida ${m}`,
      city: null,
      state: null,
      country: null,
    })

    await indexCatalogItem({ kind: 'faith_communities', id })

    assert.deepEqual(await search.searchIds(`removida ${m}`, {}, 5), [])
  })
})
