import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

// NOTE: o banco não tem a extensão `unaccent`; `translate` cobre os acentos do
// português e do espanhol, os mesmos que `normalizeCatalogKey` remove em JS.
const ACCENTED = 'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ'
const PLAIN = 'aaaaaaeeeeiiiiooooouuuucnyy'

const normalizedColumn = (column: string) =>
  `translate(lower(regexp_replace(trim(coalesce(${column}, '')), '\\s+', ' ', 'g')), '${ACCENTED}', '${PLAIN}')`

/**
 * Normaliza nome/cidade para comparar registros de catálogo: sem acentos,
 * minúsculo, sem espaços nas pontas e com espaços internos únicos.
 *
 * @example
 * normalizeCatalogKey('  Igreja  Abençoada ') // 'igreja abencoada'
 */
export function normalizeCatalogKey(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Busca, dentro da transação, um registro de catálogo (agência ou comunidade de
 * fé) com o mesmo nome e a mesma cidade, ignorando maiúsculas, acentos e
 * espaços. Antes da busca, trava a chave normalizada com um advisory lock da
 * transação para que dois cadastros simultâneos do mesmo nome não criem duas
 * linhas.
 *
 * @returns O registro existente ou `null` quando ainda não há um igual.
 */
export async function findCatalogDuplicate<Model extends LucidModel>(
  model: Model,
  trx: TransactionClientContract,
  payload: { name: string; city?: string | null }
): Promise<InstanceType<Model> | null> {
  const name = normalizeCatalogKey(payload.name)
  const city = normalizeCatalogKey(payload.city)

  await trx.rawQuery('select pg_advisory_xact_lock(hashtext(?))', [
    `${model.table}:${name}:${city}`,
  ])

  return model
    .query({ client: trx })
    .whereRaw(`${normalizedColumn('name')} = ?`, [name])
    .whereRaw(`${normalizedColumn('city')} = ?`, [city])
    .orderBy('created_at', 'asc')
    .first() as Promise<InstanceType<Model> | null>
}
