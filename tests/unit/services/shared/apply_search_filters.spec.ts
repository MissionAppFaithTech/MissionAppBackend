import FaithCommunity from '#models/faith_community'
import { applySearchFilters } from '#services/shared/apply_search_filters'
import { test } from '@japa/runner'

const bindingsFor = (filters: Parameters<typeof applySearchFilters>[1]) =>
  applySearchFilters(FaithCommunity.query(), filters).toSQL().bindings

test.group('applySearchFilters', () => {
  test('envolve cada termo em % para busca parcial', ({ assert }) => {
    assert.deepEqual(bindingsFor({ search: 'alfa', city: 'manaus' }), ['%alfa%', '%manaus%'])
  })

  test('escapa os curingas % e _ para que sejam buscados literalmente', ({ assert }) => {
    assert.deepEqual(bindingsFor({ search: '100%', country: 'a_b' }), ['%100\\%%', '%a\\_b%'])
  })

  test('escapa a própria barra invertida', ({ assert }) => {
    assert.deepEqual(bindingsFor({ state: 'a\\b' }), ['%a\\\\b%'])
  })

  test('ignora filtros vazios', ({ assert }) => {
    assert.deepEqual(bindingsFor({ search: '', city: undefined }), [])
  })
})
