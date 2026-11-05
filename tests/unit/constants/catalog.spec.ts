import { catalogMaxEdits } from '#constants/catalog'
import { test } from '@japa/runner'

test.group('catalogMaxEdits', () => {
  test('tolera 0, 1 ou 2 edições conforme o tamanho da palavra', ({ assert }) => {
    assert.deepEqual([1, 2, 3, 5, 6, 7, 12].map(catalogMaxEdits), [0, 0, 1, 1, 2, 2, 2])
  })
})
