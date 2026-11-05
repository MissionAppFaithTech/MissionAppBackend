/**
 * Busca de catálogos (agências missionárias e comunidades de fé), ADR-0041.
 */

/** Menor termo aceito: com 1 caractere a busca traria quase tudo. */
export const CATALOG_SEARCH_MIN_LENGTH = 2

/** Itens por resposta quando o cliente não informa `limit` (autocomplete). */
export const CATALOG_SEARCH_DEFAULT_LIMIT = 10
