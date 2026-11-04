import { text } from '#validators/shared/fields/text'

/**
 * Campos do local de atuação do missionário. Todos obrigatórios: o endereço é
 * sempre substituído por inteiro.
 */
export const workAddressFields = () => ({
  zip: text(1, 20),
  district: text(),
  city: text(),
  state: text(),
  country: text(),
})
