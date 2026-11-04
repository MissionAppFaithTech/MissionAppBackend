import { omitUndefined } from '#utils/omit_undefined'
import { test } from '@japa/runner'

test.group('omitUndefined', () => {
  test('remove chaves undefined e preserva null e valores falsy', ({ assert }) => {
    const result = omitUndefined({ a: 'x', b: undefined, c: null, d: '', e: 0, f: false })

    assert.deepEqual(result, { a: 'x', c: null, d: '', e: 0, f: false })
    assert.notProperty(result, 'b')
  })

  test('retorna objeto vazio quando todas as chaves são undefined', ({ assert }) => {
    assert.deepEqual(omitUndefined({ a: undefined, b: undefined }), {})
  })

  test('não altera o objeto original', ({ assert }) => {
    const original = { a: 1, b: undefined }
    omitUndefined(original)

    assert.property(original, 'b')
  })
})
