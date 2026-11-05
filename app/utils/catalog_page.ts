import type { CatalogPage } from '#services/shared/apply_search_filters'

/**
 * Resposta de uma busca de catálogo no envelope da API:
 * `{ data: { <chave>: [...] }, meta: { hasMore } }` (ADR-0041). Sem cursor: o
 * autocomplete refina o termo em vez de paginar.
 *
 * @param serialize `ctx.serialize` (embrulha em `{ data }`).
 * @param key Nome da coleção (ex.: `missionaryAgencies`).
 * @param transformed Itens já transformados.
 * @param page Página retornada por `paginateCatalog`.
 */
export async function serializeCatalogPage(
  serialize: (data: Record<string, unknown>) => unknown,
  key: string,
  transformed: unknown,
  page: CatalogPage<unknown>
): Promise<Record<string, unknown>> {
  const body = (await serialize({ [key]: transformed })) as Record<string, unknown>
  return { ...body, meta: { hasMore: page.hasMore } }
}
