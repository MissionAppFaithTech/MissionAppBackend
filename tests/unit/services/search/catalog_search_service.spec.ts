import { catalogAlias, catalogSearchRequest } from '#services/search/catalog_search_service'
import { test } from '@japa/runner'

type Bool = {
  must: Record<string, any>[]
  should: Record<string, any>[]
  filter: Record<string, any>[]
}

const boolOf = (request: ReturnType<typeof catalogSearchRequest>) =>
  (request.query as { bool: Bool }).bool

test.group('catalogSearchRequest', () => {
  test('exige cada palavra, aproximada (AUTO) ou como começo de palavra', ({ assert }) => {
    const { must } = boolOf(catalogSearchRequest('Jovens  Missão', {}, 11))

    assert.deepEqual(must, [
      {
        bool: {
          should: [
            { match: { name: { query: 'jovens', fuzziness: 'AUTO' } } },
            { match: { 'name.prefix': 'jovens' } },
          ],
          minimum_should_match: 1,
        },
      },
      {
        bool: {
          should: [
            { match: { name: { query: 'missao', fuzziness: 'AUTO' } } },
            { match: { 'name.prefix': 'missao' } },
          ],
          minimum_should_match: 1,
        },
      },
    ])
  })

  test('palavras de 1 ou 2 letras só casam como começo de palavra', ({ assert }) => {
    const { must } = boolOf(catalogSearchRequest('jocum de', {}, 11))

    assert.deepEqual(must[1], { match: { 'name.prefix': 'de' } })
  })

  test('pontua quem começa com o termo, depois a frase, depois as palavras exatas', ({
    assert,
  }) => {
    const request = catalogSearchRequest('Lagoinha', {}, 11)

    assert.deepEqual(boolOf(request).should, [
      { prefix: { 'name.sort': { value: 'lagoinha', boost: 8 } } },
      { match_phrase: { name: { query: 'lagoinha', boost: 4 } } },
      { match: { name: { query: 'lagoinha', operator: 'and', boost: 2 } } },
    ])
    assert.deepEqual(request.sort, ['_score', { 'name.sort': 'asc' }])
    assert.equal(request.size, 11)
  })

  test('filtra a localidade informada e ignora a vazia', ({ assert }) => {
    const { filter } = boolOf(catalogSearchRequest('igreja', { city: 'São Paulo', state: '' }, 5))

    assert.deepEqual(filter, [{ match: { city: { query: 'São Paulo', operator: 'and' } } }])
  })

  test('termo só de pontuação ainda vira uma busca pelo nome', ({ assert }) => {
    assert.deepEqual(boolOf(catalogSearchRequest('!!!', {}, 11)).must, [{ match: { name: '!!!' } }])
  })

  test('usa o prefixo de índices do ambiente no alias', ({ assert }) => {
    // NOTE: .env.test define ELASTIC_INDEX_PREFIX=test_
    assert.equal(catalogAlias('faith_communities'), 'test_catalog_faith_communities')
  })
})
