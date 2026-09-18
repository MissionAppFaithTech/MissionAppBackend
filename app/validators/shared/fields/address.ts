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
 * Filtros de busca aceitos nas listagens: termo livre no nome e localidade.
 */
export const searchFilterFields = () => ({
  search: text(1, 255).optional(),
  city: text(1, 255).optional(),
  state: text(1, 255).optional(),
  country: text(1, 255).optional(),
})
