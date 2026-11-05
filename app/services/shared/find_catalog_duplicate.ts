import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Normaliza nome/cidade em JS como `catalog_normalize` faz no banco: sem
 * acentos, minúsculo, sem espaços nas pontas e com espaços internos únicos.
 * Serve à chave do advisory lock e à escolha prefixo/trecho da busca; a
 * comparação em si é feita pelo banco (ADR-0041).
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
 * espaços (`name_normalized`/`city_normalized`). Antes da busca, trava a chave normalizada com um advisory lock da
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

  // NOTE: mesma normalização das colunas geradas e do índice único
  // `uq_<tabela>_name_normalized_city_normalized`, que garante a regra no banco
  return model
    .query({ client: trx })
    .whereRaw('name_normalized = catalog_normalize(?)', [payload.name])
    .whereRaw("city_normalized = coalesce(catalog_normalize(?), '')", [payload.city ?? ''])
    .first() as Promise<InstanceType<Model> | null>
}
