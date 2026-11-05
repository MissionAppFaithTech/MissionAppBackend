import { IdentityType } from '#enums/missionary/identity_type'
import { uniqueViolationFieldError } from '#utils/unique_violation_field_error'
import { test } from '@japa/runner'

const violation = (constraint: string) => ({ code: '23505', constraint })
const fieldOf = (error: unknown) =>
  (error as { messages: { field: string; message: string }[] }).messages[0]

test.group('uniqueViolationFieldError', () => {
  test('o documento duplicado vira erro no campo identityDocument, com a mensagem do tipo', ({
    assert,
  }) => {
    assert.deepInclude(
      fieldOf(uniqueViolationFieldError(violation('uq_missionaries_identity'), IdentityType.CPF)),
      {
        field: 'identityDocument',
        message: 'Este CPF já está cadastrado.',
      }
    )
    assert.deepInclude(
      fieldOf(
        uniqueViolationFieldError(violation('uq_missionaries_identity'), IdentityType.PASSPORT)
      ),
      { field: 'identityDocument', message: 'Este passaporte já está cadastrado.' }
    )
  })

  test('e-mail e usuário duplicados viram erro nos seus campos', ({ assert }) => {
    assert.equal(fieldOf(uniqueViolationFieldError(violation('uq_users_email'))).field, 'email')
    assert.equal(
      fieldOf(uniqueViolationFieldError(violation('uq_users_username'))).field,
      'username'
    )
  })

  test('ignora outros erros e outras constraints', ({ assert }) => {
    assert.isNull(uniqueViolationFieldError(violation('uq_outra_coisa')))
    assert.isNull(uniqueViolationFieldError({ code: '23503', constraint: 'uq_users_email' }))
    assert.isNull(uniqueViolationFieldError(new Error('boom')))
  })
})
