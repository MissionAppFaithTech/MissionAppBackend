import { IdentityType } from '#enums/missionary/identity_type'
import { isIdentityDocumentValid, normalizeIdentityDocument } from '#utils/identity_document'
import { test } from '@japa/runner'

test.group('normalizeIdentityDocument', () => {
  test('deixa o CPF só com dígitos', ({ assert }) => {
    assert.equal(normalizeIdentityDocument(IdentityType.CPF, ' 123.456.789-09 '), '12345678909')
  })

  test('deixa o passaporte em maiúsculas, só com letras e números', ({ assert }) => {
    assert.equal(normalizeIdentityDocument(IdentityType.PASSPORT, 'ab 12-34.c'), 'AB1234C')
  })

  test('valida só o formato: CPF com 11 dígitos, passaporte com letras e números', ({ assert }) => {
    // NOTE: sem dígito verificador — um passaporte estrangeiro pode ter 11 dígitos
    assert.isTrue(isIdentityDocumentValid(IdentityType.CPF, '12345678901'))
    assert.isFalse(isIdentityDocumentValid(IdentityType.CPF, '1234567890'))
    assert.isFalse(isIdentityDocumentValid(IdentityType.CPF, '123456789012'))
    assert.isTrue(isIdentityDocumentValid(IdentityType.PASSPORT, '12345678901'))
    assert.isTrue(isIdentityDocumentValid(IdentityType.PASSPORT, 'FX123456'))
    assert.isFalse(isIdentityDocumentValid(IdentityType.PASSPORT, ''))
  })
})
