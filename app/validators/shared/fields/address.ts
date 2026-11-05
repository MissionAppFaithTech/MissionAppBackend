import { CATALOG_SEARCH_MIN_LENGTH } from '#constants/catalog'
import { limit } from '#validators/shared/fields/limit'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

/**
 * Campos opcionais de endereço/contato compartilhados por agências
 * missionárias e comunidades de fé.
 */
export const addressFields = () => ({
  addressLine1: text(1, 255).optional(),
  addressLine2: text(1, 255).optional(),
  city: text(1, 255).optional(),
  state: text(1, 255).optional(),
  country: text(1, 255).optional(),
  postalCode: text(1, 32).optional(),
  website: vine.string().trim().url().maxLength(255).optional(),
})

/**
 * Filtros de busca aceitos nas listagens: termo no nome (a partir de
 * {@link CATALOG_SEARCH_MIN_LENGTH} caracteres), localidade e `limit` (até 20,
 * NF 2.3; padrão 10). ADR-0041.
 */
export const searchFilterFields = () => ({
  search: text(CATALOG_SEARCH_MIN_LENGTH, 255).optional(),
  limit: limit(),
  city: text(1, 255).optional(),
  state: text(1, 255).optional(),
  country: text(1, 255).optional(),
})
