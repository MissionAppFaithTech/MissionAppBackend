import FaithCommunity from '#models/faith_community'
import { applySearchFilters, searchWords } from '#services/shared/apply_search_filters'
import { test } from '@japa/runner'
import { CATALOG_FUZZY_MIN_SIMILARITY } from '#constants/catalog'

const sqlFor = (filters: Parameters<typeof applySearchFilters>[1]) =>
  applySearchFilters(FaithCommunity.query(), filters).toSQL()

test.group('applySearchFilters', () => {
  test('a partir de 3 caracteres cada palavra casa por trecho, semelhança ou edições', ({
    assert,
  }) => {
    const { sql, bindings } = sqlFor({ search: 'missões' })

    assert.include(sql, `name_normalized LIKE '%' || catalog_normalize(?) || '%'`)
    assert.include(sql, 'word_similarity(catalog_normalize(?), name_normalized) >= ?')
    assert.include(sql, 'levenshtein_less_equal(catalog_normalize(?), name_word.value, ?) <= ?')
    // NOTE: começa com o termo, depois contém o termo inteiro, depois o mais parecido
    assert.include(sql, `(name_normalized LIKE catalog_normalize(?) || '%') DESC`)
    assert.include(sql, `(name_normalized LIKE '%' || catalog_normalize(?) || '%') DESC`)
    assert.include(sql, '(word_similarity(catalog_normalize(?), name_normalized)) DESC')
    assert.deepEqual(bindings, [
      'missoes',
      'missoes',
      CATALOG_FUZZY_MIN_SIMILARITY,
      'missoes',
      2,
      2,
      'missões',
      'missões',
      'missoes',
    ])
  })

  test('exige todas as palavras, em qualquer ordem, e soma a semelhança de cada uma', ({
    assert,
  }) => {
    const { sql, bindings } = sqlFor({ search: 'Jovens  missão' })

    assert.equal(
      sql.match(/word_similarity\(catalog_normalize\(\?\), name_normalized\) >= \?/g)?.length,
      2
    )
    assert.include(
      sql,
      '(word_similarity(catalog_normalize(?), name_normalized) + word_similarity(catalog_normalize(?), name_normalized)) DESC'
    )
    assert.deepEqual(bindings.slice(-2), ['jovens', 'missao'])
  })

  test('palavras de 1 ou 2 letras só casam por trecho', ({ assert }) => {
    const { sql, bindings } = sqlFor({ search: 'ab cd' })

    assert.notInclude(sql, 'levenshtein_less_equal')
    assert.notInclude(sql, '>= ?')
    assert.deepEqual(bindings.slice(0, 2), ['ab', 'cd'])
  })

  test('termo só de pontuação busca o trecho literal', ({ assert }) => {
    const { sql, bindings } = sqlFor({ search: '!!!' })

    assert.notInclude(sql, 'word_similarity')
    assert.include(sql, `name_normalized LIKE '%' || catalog_normalize(?) || '%'`)
    assert.deepEqual(bindings, ['!!!', '!!!', '!!!'])
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

  test('escapa os curingas % e _ do trecho para que sejam buscados literalmente', ({ assert }) => {
    // NOTE: bindings do WHERE (palavras, país) antes do ORDER BY; o trecho
    // literal ('100%') só ordena — as palavras ignoram a pontuação
    assert.deepEqual(sqlFor({ search: '50%_off', country: 'a_b' }).bindings, [
      '50',
      'off',
      'off',
      CATALOG_FUZZY_MIN_SIMILARITY,
      'off',
      1,
      1,
      '%a\\_b%',
      '50\\%\\_off',
      '50\\%\\_off',
      '50',
      'off',
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

test.group('searchWords', () => {
  test('separa pela pontuação, remove repetidas e limita a 5 palavras', ({ assert }) => {
    assert.deepEqual(searchWords('jocum (jovens) jocum'), ['jocum', 'jovens'])
    assert.deepEqual(searchWords('a b c d e f g'), ['a', 'b', 'c', 'd', 'e'])
    assert.deepEqual(searchWords('...'), [])
  })
})
