import { documentMask } from '#utils/document_mask'
import { test } from '@japa/runner'

test.group('documentMask', () => {
  test('{label}')
    .with([
      {
        label: 'CPF mostra só os seis dígitos do meio',
        input: '12345678909',
        expected: '***.456.789-**',
      },
      {
        label: 'CNPJ sai completo e formatado',
        input: '12345678000195',
        expected: '12.345.678/0001-95',
      },
      { label: 'formato inesperado é todo mascarado', input: '1234', expected: '****' },
    ])
    .run(({ assert }, row) => {
      assert.equal(documentMask(row.input), row.expected)
    })
})
