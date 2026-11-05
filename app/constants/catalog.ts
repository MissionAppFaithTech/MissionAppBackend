/**
 * Busca de catálogos (agências missionárias e comunidades de fé), ADR-0041 e ADR-0042.
 */

/** Menor termo aceito: com 1 caractere a busca traria quase tudo. */
export const CATALOG_SEARCH_MIN_LENGTH = 2

/**
 * A partir deste tamanho (termo normalizado) a busca é tolerante a erros
 * (ADR-0042); termos menores buscam pelo começo do nome. Com menos de 3
 * caracteres trigramas e edições não ajudam.
 */
export const CATALOG_FUZZY_MIN_LENGTH = 3

/** Itens por resposta quando o cliente não informa `limit` (autocomplete). */
export const CATALOG_SEARCH_DEFAULT_LIMIT = 10

/**
 * Nota mínima de `word_similarity` (pg_trgm) para uma palavra digitada casar com
 * o nome, ADR-0042. Equilibra acertos ("igrja" → igreja, 0,50) e ruído
 * ("jocun" → "Junta de Missões", 0,17).
 */
export const CATALOG_FUZZY_MIN_SIMILARITY = 0.45

/** Palavras do termo consideradas na busca aproximada; as demais são ignoradas. */
export const CATALOG_SEARCH_MAX_WORDS = 5

/**
 * Edições (Levenshtein) toleradas entre a palavra digitada e uma palavra do
 * nome, pelo tamanho da palavra digitada: as mesmas faixas do `fuzziness: AUTO`
 * do Elasticsearch. Uma inversão de letras ("batsita") custa 2 edições.
 *
 * @example
 * catalogMaxEdits(2) // 0 — curta demais, só por trecho
 * catalogMaxEdits(5) // 1
 * catalogMaxEdits(7) // 2
 */
export function catalogMaxEdits(length: number): 0 | 1 | 2 {
  if (length < 3) return 0
  return length < 6 ? 1 : 2
}
