import { isForeignKeyViolation, isUniqueViolation } from '#utils/postgres_errors'
import { test } from '@japa/runner'

test.group('postgres_errors', () => {
  test('reconhece violação de FK pelo código 23503', ({ assert }) => {
    assert.isTrue(isForeignKeyViolation({ code: '23503' }))
    assert.isFalse(isForeignKeyViolation({ code: '23505' }))
    assert.isFalse(isForeignKeyViolation(new Error('qualquer')))
    assert.isFalse(isForeignKeyViolation(null))
    assert.isFalse(isForeignKeyViolation('23503'))
  })

  test('reconhece violação de unicidade, opcionalmente de uma constraint', ({ assert }) => {
    const violation = { code: '23505', constraint: 'uq_missionaries_user_id' }

    assert.isTrue(isUniqueViolation(violation))
    assert.isTrue(isUniqueViolation(violation, 'uq_missionaries_user_id'))
    assert.isFalse(isUniqueViolation(violation, 'uq_users_email'))
    assert.isFalse(isUniqueViolation({ code: '23503', constraint: 'uq_missionaries_user_id' }))
    assert.isFalse(isUniqueViolation(undefined))
  })
})
