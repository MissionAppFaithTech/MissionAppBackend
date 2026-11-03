import { CURSOR_PAGE_DEFAULT_LIMIT, CURSOR_PAGE_MAX_LIMIT } from '#constants/pagination'
import InvalidCursorException from '#exceptions/shared/invalid_cursor_exception'

/**
 * Posição de um item na ordenação `(coluna, id) DESC` (ADR-0033): `v` é o valor
 * da coluna de ordenação e `id` desempata itens com o mesmo valor (UUID v7).
 */
export type Cursor = { v: string; id: string }

/** Uma página de itens e o cursor da próxima (ou `null` na última). */
export type CursorPage<T> = { items: T[]; nextCursor: string | null; hasMore: boolean }

/** Bloco `meta` das respostas paginadas por cursor. */
export type CursorPageMeta = { nextCursor: string | null; hasMore: boolean }

/**
 * Query builder mínimo usado pela paginação — qualquer `ModelQueryBuilder` do
 * Lucid serve, sem acoplar a um model.
 */
type CursorQuery<Row> = {
  whereRaw(sql: string, bindings: unknown[]): unknown
  orderBy(column: string, direction: 'desc'): unknown
  limit(limit: number): unknown
  exec(): Promise<Row[]>
}

type PaginateOptions<Row> = {
  /** Coluna de ordenação (pode vir qualificada, ex.: `posts.created_at`). */
  column: string
  /** Coluna de desempate; padrão `id`. */
  idColumn?: string
  /** Valor de ordenação de uma linha, gravado no cursor. */
  valueOf: (row: Row) => string
  /** Id da linha, gravado no cursor. */
  idOf: (row: Row) => string
  cursor?: string | null
  limit?: number
}

/**
 * Codifica um cursor como base64url de JSON — opaco para o cliente.
 *
 * @param cursor Posição do último item entregue.
 * @returns Cursor opaco para `meta.nextCursor`.
 * @example
 * encodeCursor({ v: post.createdAt.toISO()!, id: post.id })
 */
export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify({ v: cursor.v, id: cursor.id })).toString('base64url')
}

/**
 * Decodifica um cursor recebido do cliente.
 *
 * @param raw Cursor opaco recebido em `?cursor=`.
 * @returns A posição `{ v, id }`.
 * @throws {InvalidCursorException} Cursor que não é base64url de `{ v, id }` com strings.
 * @example
 * const { v, id } = decodeCursor(request.qs().cursor)
 */
export function decodeCursor(raw: string): Cursor {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    throw new InvalidCursorException()
  }

  const { v, id } = (parsed ?? {}) as Record<string, unknown>
  if (typeof v !== 'string' || !v || typeof id !== 'string' || !id) {
    throw new InvalidCursorException()
  }
  return { v, id }
}

/**
 * Limite efetivo de uma página: padrão 20, nunca acima do teto do NF 2.3.
 */
export function resolveLimit(limit?: number): number {
  if (!limit || limit < 1) return CURSOR_PAGE_DEFAULT_LIMIT
  return Math.min(Math.floor(limit), CURSOR_PAGE_MAX_LIMIT)
}

/**
 * Pagina uma consulta por keyset `(coluna, id) DESC` (ADR-0033). Busca
 * `limit + 1` linhas para saber se há próxima página sem `COUNT(*)`.
 *
 * @param query Query já filtrada (ex.: posts de um missionário), sem `orderBy`/`limit`.
 * @param options Coluna de ordenação, extratores do cursor, cursor recebido e limite.
 * @returns Itens da página, `nextCursor` (ou `null`) e `hasMore`.
 * @throws {InvalidCursorException} Cursor malformado.
 * @example
 * const page = await paginateByCursor(Post.query().where('missionaryId', id), {
 *   column: 'created_at',
 *   valueOf: (post) => post.createdAt.toISO()!,
 *   idOf: (post) => post.id,
 *   cursor: qs.cursor,
 *   limit: qs.limit,
 * })
 */
export async function paginateByCursor<Row>(
  query: CursorQuery<Row>,
  options: PaginateOptions<Row>
): Promise<CursorPage<Row>> {
  const idColumn = options.idColumn ?? 'id'
  const limit = resolveLimit(options.limit)

  if (options.cursor) {
    const { v, id } = decodeCursor(options.cursor)
    query.whereRaw('(??, ??) < (?, ?)', [options.column, idColumn, v, id])
  }
  query.orderBy(options.column, 'desc')
  query.orderBy(idColumn, 'desc')
  query.limit(limit + 1)

  const rows = await query.exec()
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items.at(-1)
  const nextCursor =
    hasMore && last ? encodeCursor({ v: options.valueOf(last), id: options.idOf(last) }) : null

  return { items, nextCursor, hasMore }
}

/**
 * Bloco `meta` de uma página por cursor.
 */
export function cursorPageMeta(page: CursorPage<unknown>): CursorPageMeta {
  return { nextCursor: page.nextCursor, hasMore: page.hasMore }
}

/**
 * Monta a resposta paginada por cursor no envelope da API:
 * `{ data: { <chave>: [...] }, meta: { nextCursor, hasMore } }`.
 *
 * @param serialize `ctx.serialize` (embrulha em `{ data }`).
 * @param key Nome da coleção (ex.: `posts`).
 * @param transformed Itens já transformados (ex.: `PostTransformer.transform(page.items)`).
 * @param page Página retornada por {@link paginateByCursor}.
 * @example
 * return serializeCursorPage(serialize, 'posts', PostTransformer.transform(page.items), page)
 */
export async function serializeCursorPage(
  serialize: (data: Record<string, unknown>) => unknown,
  key: string,
  transformed: unknown,
  page: CursorPage<unknown>
): Promise<Record<string, unknown>> {
  const body = (await serialize({ [key]: transformed })) as Record<string, unknown>
  return { ...body, meta: cursorPageMeta(page) }
}
