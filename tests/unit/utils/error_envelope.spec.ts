import {
  GENERIC_ERROR_MESSAGE,
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
  VALIDATION_ERROR_MESSAGE,
  normalizeError,
  toFieldErrors,
  tooManyRequestsEnvelope,
} from '#utils/error_envelope'
import { Exception } from '@adonisjs/core/exceptions'
import { test } from '@japa/runner'

test.group('normalizeError', () => {
  test('usa status, code e mensagem de uma exceção de domínio', ({ assert }) => {
    const error = new Exception('Agência não encontrada', {
      status: 404,
      code: 'E_MISSIONARY_AGENCY_NOT_FOUND',
    })

    assert.deepEqual(normalizeError(error), {
      status: 404,
      retryAfterSeconds: undefined,
      envelope: { message: 'Agência não encontrada', code: 'E_MISSIONARY_AGENCY_NOT_FOUND' },
    })
  })

  test('converte erros do VineJS em `errors` por campo', ({ assert }) => {
    const error = Object.assign(new Error('Validation failure'), {
      status: 422,
      code: 'E_VALIDATION_ERROR',
      messages: [
        { field: 'email', rule: 'email', message: 'E-mail inválido' },
        { field: 'username', rule: 'regex', message: 'Username inválido' },
      ],
    })

    const { status, envelope } = normalizeError(error)

    assert.equal(status, 422)
    assert.equal(envelope.code, 'E_VALIDATION_ERROR')
    assert.equal(envelope.message, VALIDATION_ERROR_MESSAGE)
    assert.deepEqual(envelope.errors, [
      { field: 'email', rule: 'email', message: 'E-mail inválido' },
      { field: 'username', rule: 'regex', message: 'Username inválido' },
    ])
  })

  test('com um único erro de campo, a mensagem principal é a do campo', ({ assert }) => {
    const error = Object.assign(new Error('Validation failure'), {
      status: 422,
      code: 'E_VALIDATION_ERROR',
      messages: [{ field: 'email', rule: 'email', message: 'E-mail inválido' }],
    })

    assert.equal(normalizeError(error).envelope.message, 'E-mail inválido')
  })

  test('validação sem campos (lançada à mão) sai só com code e mensagem', ({ assert }) => {
    const error = new Exception('Nome de usuário já está em uso', {
      status: 422,
      code: 'E_VALIDATION_ERROR',
    })

    assert.deepEqual(normalizeError(error).envelope, {
      message: 'Nome de usuário já está em uso',
      code: 'E_VALIDATION_ERROR',
    })
  })

  test('expõe retryAfterSeconds em meta, arredondado para cima', ({ assert }) => {
    const error = Object.assign(new Exception('Conta bloqueada', { status: 423 }), {
      code: 'E_ACCOUNT_LOCKED',
      retryAfterSeconds: 89.2,
    })

    const normalized = normalizeError(error)

    assert.equal(normalized.retryAfterSeconds, 90)
    assert.deepEqual(normalized.envelope.meta, { retryAfterSeconds: 90 })
  })

  test('ignora retryAfterSeconds inválido', ({ assert }) => {
    const error = Object.assign(new Exception('x', { status: 423 }), { retryAfterSeconds: -5 })
    assert.isUndefined(normalizeError(error).envelope.meta)
  })

  test('traduz erros do framework que chegam em inglês', ({ assert }) => {
    const route = new Exception('Cannot GET:/x', { status: 404, code: 'E_ROUTE_NOT_FOUND' })
    const row = new Exception('Row not found', { status: 404, code: 'E_ROW_NOT_FOUND' })

    assert.equal(normalizeError(route).envelope.message, 'Rota não encontrada.')
    assert.equal(normalizeError(row).envelope.message, 'Recurso não encontrado.')
  })

  test('deriva o code do status quando o erro não tem um', ({ assert }) => {
    const forbidden = new Exception('Proibido', { status: 403 })
    const unknown = new Exception('Teapot', { status: 418 })

    assert.equal(normalizeError(forbidden).envelope.code, 'E_FORBIDDEN')
    assert.equal(normalizeError(unknown).envelope.code, 'E_HTTP_ERROR')
  })

  test('code que não segue o padrão E_* é substituído pelo do status', ({ assert }) => {
    const error = new Exception('Conflito', { status: 409, code: 'conflict' })
    assert.equal(normalizeError(error).envelope.code, 'E_CONFLICT')
  })

  test('mensagem vazia recebe um texto genérico', ({ assert }) => {
    const error = new Exception('', { status: 409, code: 'E_CONFLICT' })
    assert.equal(normalizeError(error).envelope.message, GENERIC_ERROR_MESSAGE)
  })

  test('erro sem status vira 500 genérico, sem vazar detalhes', ({ assert }) => {
    const { status, envelope } = normalizeError(new TypeError('cannot read secret of undefined'))

    assert.equal(status, 500)
    assert.deepEqual(envelope, { message: INTERNAL_ERROR_MESSAGE, code: INTERNAL_ERROR_CODE })
  })

  test('5xx com debug ligado inclui o detalhe, nunca a mensagem pública', ({ assert }) => {
    const { envelope } = normalizeError(new TypeError('boom'), { debug: true })

    assert.equal(envelope.message, INTERNAL_ERROR_MESSAGE)
    assert.equal(envelope.debug?.name, 'TypeError')
    assert.equal(envelope.debug?.message, 'boom')
    assert.isString(envelope.debug?.stack)
  })

  test('valores lançados que não são objetos viram 500', ({ assert }) => {
    assert.equal(normalizeError('oops').status, 500)
    assert.equal(normalizeError(null).status, 500)
    assert.equal(normalizeError(undefined, { debug: true }).envelope.debug?.message, 'undefined')
  })

  test('status fora de 4xx/5xx é tratado como 500', ({ assert }) => {
    assert.equal(normalizeError(new Exception('x', { status: 302 })).status, 500)
  })
})

test.group('toFieldErrors', () => {
  test('descarta entradas sem mensagem e completa campo/regra ausentes', ({ assert }) => {
    assert.deepEqual(
      toFieldErrors([
        { field: 'name', rule: 'required', message: 'Obrigatório' },
        { message: 'Sem campo' },
        { field: 'x', rule: 'y', message: '' },
        'texto solto',
        null,
      ]),
      [
        { field: 'name', rule: 'required', message: 'Obrigatório' },
        { field: '', rule: '', message: 'Sem campo' },
      ]
    )
  })

  test('aceita apenas arrays', ({ assert }) => {
    assert.deepEqual(toFieldErrors(undefined), [])
    assert.deepEqual(toFieldErrors({ field: 'a' }), [])
  })
})

test.group('tooManyRequestsEnvelope', () => {
  test('monta o envelope de 429 com o tempo de espera', ({ assert }) => {
    assert.deepEqual(tooManyRequestsEnvelope('Calma', 60), {
      message: 'Calma',
      code: 'E_TOO_MANY_REQUESTS',
      meta: { retryAfterSeconds: 60 },
    })
  })
})
