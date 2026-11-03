import InvalidCursorException from '#exceptions/shared/invalid_cursor_exception'
import {
  cursorPageMeta,
  decodeCursor,
  encodeCursor,
  resolveLimit,
  serializeCursorPage,
} from '#utils/cursor_pagination'
import { cursorPaginationSchema } from '#validators/shared/schemas/cursor_pagination'
import vine from '@vinejs/vine'
import { test } from '@japa/runner'

const base64url = (value: string) => Buffer.from(value).toString('base64url')

test.group('encodeCursor/decodeCursor', () => {
  test('ida e volta preserva a posição', ({ assert }) => {
    const cursor = { v: '2026-11-03T12:00:00.123Z', id: '01a19f9f-4bcd-7252-a3f6-80aed127f2d2' }
    const encoded = encodeCursor(cursor)

    assert.match(encoded, /^[\w-]+$/)
    assert.deepEqual(decodeCursor(encoded), cursor)
  })

  test('o cursor é opaco: não expõe JSON legível', ({ assert }) => {
    assert.notInclude(encodeCursor({ v: 'abc', id: 'xyz' }), '{')
  })

  test('cursor que não é base64url de JSON é rejeitado com E_INVALID_CURSOR', ({ assert }) => {
    for (const raw of [base64url('não é json'), base64url('null'), base64url('42'), '%%%']) {
      assert.throws(() => decodeCursor(raw), InvalidCursorException as never)
    }
  })

  test('cursor sem v/id ou com tipos errados é rejeitado', ({ assert }) => {
    for (const payload of [{}, { v: 'x' }, { id: 'y' }, { v: '', id: 'y' }, { v: 1, id: 2 }]) {
      assert.throws(
        () => decodeCursor(base64url(JSON.stringify(payload))),
        InvalidCursorException as never
      )
    }
  })

  test('a exceção usa status 422 e o code do contrato', ({ assert }) => {
    const error = new InvalidCursorException()
    assert.equal(error.status, 422)
    assert.equal(error.code, 'E_INVALID_CURSOR')
  })
})

test.group('resolveLimit', () => {
  test('usa 20 por padrão e nunca passa do teto do NF 2.3', ({ assert }) => {
    assert.equal(resolveLimit(), 20)
    assert.equal(resolveLimit(0), 20)
    assert.equal(resolveLimit(-3), 20)
    assert.equal(resolveLimit(5), 5)
    assert.equal(resolveLimit(7.9), 7)
    assert.equal(resolveLimit(500), 20)
  })
})

test.group('cursorPaginationSchema', () => {
  const validate = (data: unknown) => vine.create(cursorPaginationSchema()).validate(data)

  test('aceita limit de 1 a 20 e cursor opcional', async ({ assert }) => {
    assert.deepEqual(await validate({}), {})
    assert.deepEqual(await validate({ limit: 20, cursor: ' abc ' }), { limit: 20, cursor: 'abc' })
  })

  test('recusa limit acima de 20, zero ou fracionado', async ({ assert }) => {
    for (const limit of [21, 0, 2.5]) {
      await assert.rejects(() => validate({ limit }))
    }
  })

  test('recusa cursor maior que 512 caracteres', async ({ assert }) => {
    await assert.rejects(() => validate({ cursor: 'a'.repeat(513) }))
  })
})

test.group('cursorPageMeta/serializeCursorPage', () => {
  test('meta traz só nextCursor e hasMore', ({ assert }) => {
    assert.deepEqual(cursorPageMeta({ items: [1, 2], nextCursor: 'c', hasMore: true }), {
      nextCursor: 'c',
      hasMore: true,
    })
  })

  test('monta { data: { <chave> }, meta } a partir do serialize do contexto', async ({
    assert,
  }) => {
    const serialize = async (data: Record<string, unknown>) => ({ data })
    const page = { items: ['a'], nextCursor: null, hasMore: false }

    assert.deepEqual(await serializeCursorPage(serialize, 'posts', [{ id: 'a' }], page), {
      data: { posts: [{ id: 'a' }] },
      meta: { nextCursor: null, hasMore: false },
    })
  })
})
