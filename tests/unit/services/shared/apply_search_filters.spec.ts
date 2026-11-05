import FaithCommunity from '#models/faith_community'
import { applySearchFilters } from '#services/shared/apply_search_filters'
import { test } from '@japa/runner'

const sqlFor = (filters: Parameters<typeof applySearchFilters>[1]) =>
  applySearchFilters(FaithCommunity.query(), filters).toSQL()

test.group('applySearchFilters', () => {
  test('busca por trecho no nome normalizado a partir de 3 caracteres', ({ assert }) => {
    const { sql, bindings } = sqlFor({ search: 'missões' })

    assert.include(sql, `name_normalized LIKE '%' || catalog_normalize(?) || '%'`)
    // NOTE: quem começa com o termo vem antes dos que só o contêm
    assert.include(sql, `(name_normalized LIKE catalog_normalize(?) || '%') DESC`)
    assert.deepEqual(bindings, ['missões', 'missões'])
  })

  test('busca por prefixo com 2 caracteres (sem trigramas)', ({ assert }) => {
    const { sql, bindings } = sqlFor({ search: 'Jo' })

    assert.include(sql, `name_normalized LIKE catalog_normalize(?) || '%'`)
    assert.notInclude(sql, `LIKE '%' || catalog_normalize`)
    assert.deepEqual(bindings, ['Jo'])
  })

  test('conta o tamanho do termo já normalizado (acentos e espaços)', ({ assert }) => {
    // ' Sé ' normaliza para 'se' (2 caracteres): continua sendo busca por prefixo
    assert.notInclude(sqlFor({ search: ' Sé ' }).sql, `LIKE '%' || catalog_normalize`)
  })

  test('escapa os curingas % e _ para que sejam buscados literalmente', ({ assert }) => {
    // NOTE: bindings do WHERE (nome, país) antes do ORDER BY (prefixo primeiro)
    assert.deepEqual(sqlFor({ search: '100%', country: 'a_b' }).bindings, [
      '100\\%',
      '%a\\_b%',
      '100\\%',
    ])
  })

  test('escapa a própria barra invertida', ({ assert }) => {
    assert.deepEqual(sqlFor({ state: 'a\\b' }).bindings, ['%a\\\\b%'])
  })

  test('filtra a cidade pelo valor normalizado', ({ assert }) => {
    const { sql, bindings } = sqlFor({ city: 'São Paulo' })

    assert.include(sql, `city_normalized LIKE '%' || catalog_normalize(?) || '%'`)
    assert.deepEqual(bindings, ['São Paulo'])
  })

  test('ordena pelo nome normalizado e ignora filtros vazios', ({ assert }) => {
    const { sql, bindings } = sqlFor({ search: '', city: undefined })

    assert.include(sql, 'order by "name_normalized" asc, "id" asc')
    assert.deepEqual(bindings, [])
  })
})
