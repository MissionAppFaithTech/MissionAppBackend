import InvalidCursorException from '#exceptions/shared/invalid_cursor_exception'
import Post from '#models/post'
import { createMissionaryTestUser } from '#tests/functional/missionary/helpers'
import { paginateByCursor } from '#utils/cursor_pagination'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { v7 as uuidv7 } from 'uuid'

/**
 * Integração do keyset com a tabela `posts` real (ADR-0033): ordem estável por
 * (created_at, id) DESC, sem duplicata nem buraco entre páginas.
 */
test.group('paginateByCursor com posts', (group) => {
  group.each.setup(async () => {
    const rollback = await testUtils.db().wrapInGlobalTransaction()
    return rollback
  })

  async function createPosts(missionaryId: string, createdAt: DateTime[]) {
    const posts: Post[] = []
    for (const [index, at] of createdAt.entries()) {
      posts.push(
        await Post.create({
          missionaryId,
          content: `Post ${index}`,
          slug: `post-${uuidv7()}`,
          createdAt: at,
        })
      )
    }
    return posts
  }

  function page(missionaryId: string, cursor?: string | null, limit?: number) {
    return paginateByCursor(Post.query().where('missionaryId', missionaryId), {
      column: 'created_at',
      valueOf: (post) => post.createdAt.toISO()!,
      idOf: (post) => post.id,
      cursor,
      limit,
    })
  }

  async function collectAll(missionaryId: string, limit: number) {
    const ids: string[] = []
    let cursor: string | null = null
    let pages = 0
    do {
      const result = await page(missionaryId, cursor, limit)
      ids.push(...result.items.map((post) => post.id))
      cursor = result.nextCursor
      pages++
    } while (cursor && pages < 50)
    return { ids, pages }
  }

  test('percorre tudo em ordem decrescente, sem duplicar nem pular', async ({ assert }) => {
    const { missionary } = await createMissionaryTestUser()
    const start = DateTime.now().minus({ hours: 1 })
    const posts = await createPosts(
      missionary.id,
      Array.from({ length: 7 }, (_, i) => start.plus({ minutes: i }))
    )

    const { ids, pages } = await collectAll(missionary.id, 3)

    assert.equal(pages, 3)
    assert.deepEqual(ids, posts.map((post) => post.id).reverse())
  })

  test('itens com o mesmo created_at são desempatados pelo id', async ({ assert }) => {
    const { missionary } = await createMissionaryTestUser()
    const sameInstant = DateTime.now().minus({ minutes: 5 }).startOf('second')
    const posts = await createPosts(missionary.id, Array(5).fill(sameInstant))

    const { ids } = await collectAll(missionary.id, 2)

    assert.lengthOf(ids, 5)
    assert.lengthOf(new Set(ids), 5)
    assert.sameMembers(
      ids,
      posts.map((post) => post.id)
    )
    assert.deepEqual(ids, [...ids].sort().reverse())
  })

  test('posts novos no topo durante a paginação não duplicam itens', async ({ assert }) => {
    const { missionary } = await createMissionaryTestUser()
    const start = DateTime.now().minus({ hours: 2 })
    await createPosts(
      missionary.id,
      Array.from({ length: 4 }, (_, i) => start.plus({ minutes: i }))
    )

    const first = await page(missionary.id, null, 2)
    await createPosts(missionary.id, [DateTime.now()])
    const second = await page(missionary.id, first.nextCursor, 2)

    const seen = [...first.items, ...second.items].map((post) => post.id)
    assert.lengthOf(new Set(seen), 4)
    assert.isFalse(second.hasMore)
    assert.isNull(second.nextCursor)
  })

  test('a última página informa hasMore false e nextCursor nulo', async ({ assert }) => {
    const { missionary } = await createMissionaryTestUser()
    await createPosts(missionary.id, [DateTime.now().minus({ minutes: 1 }), DateTime.now()])

    const result = await page(missionary.id, null, 20)

    assert.lengthOf(result.items, 2)
    assert.isFalse(result.hasMore)
    assert.isNull(result.nextCursor)
  })

  test('limite acima de 20 é reduzido ao teto', async ({ assert }) => {
    const { missionary } = await createMissionaryTestUser()
    const start = DateTime.now().minus({ hours: 1 })
    await createPosts(
      missionary.id,
      Array.from({ length: 22 }, (_, i) => start.plus({ seconds: i }))
    )

    const result = await page(missionary.id, null, 100)

    assert.lengthOf(result.items, 20)
    assert.isTrue(result.hasMore)
  })

  test('cursor malformado é rejeitado antes de consultar', async ({ assert }) => {
    const { missionary } = await createMissionaryTestUser()
    await assert.rejects(() => page(missionary.id, 'nao-e-um-cursor'), InvalidCursorException)
  })
})
