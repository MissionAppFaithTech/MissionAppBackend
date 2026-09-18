import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export type SearchFilters = {
  search?: string
  city?: string
  state?: string
  country?: string
}

const escapeLike = (value: string): string => value.replace(/[\%_]/g, '\$&')

/**
 * Aplica busca parcial (case-insensitive) por nome e por localidade
 * (cidade, estado, país) em uma query de model com essas colunas.
 */
export function applySearchFilters<Q extends ModelQueryBuilderContract<any, any>>(
  query: Q,
  filters: SearchFilters
): Q {
  const columns = ['city', 'state', 'country'] as const

  if (filters.search) {
    query.whereILike('name', `%${escapeLike(filters.search)}%`)
  }

  for (const column of columns) {
    const value = filters[column]
    if (value) {
      query.whereILike(column, `%${escapeLike(value)}%`)
    }
  }

  return query
}
