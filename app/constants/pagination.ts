/**
 * Paginação por cursor (ADR-0033): o NF 2.3 fixa 20 itens como teto por
 * requisição; telas que precisam de menos pedem um `limit` menor.
 */
export const CURSOR_PAGE_MAX_LIMIT = 20
export const CURSOR_PAGE_DEFAULT_LIMIT = 20

/** Tamanho máximo aceito para um cursor opaco (base64url de `{ v, id }`). */
export const CURSOR_MAX_LENGTH = 512
