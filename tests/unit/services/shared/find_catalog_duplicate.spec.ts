import { normalizeCatalogKey } from '#services/shared/find_catalog_duplicate'
import { test } from '@japa/runner'

test.group('normalizeCatalogKey', () => {
  test('remove acentos, maiúsculas e espaços extras', ({ assert }) => {
    assert.equal(normalizeCatalogKey('  Igreja   Muito ABENÇOADA '), 'igreja muito abencoada')
  })

  test('trata nulo e indefinido como texto vazio', ({ assert }) => {
    assert.equal(normalizeCatalogKey(null), '')
    assert.equal(normalizeCatalogKey(undefined), '')
  })

  test('preserva o que não é acento', ({ assert }) => {
    assert.equal(normalizeCatalogKey('JOCUM-Brasil 2'), 'jocum-brasil 2')
  })
})
