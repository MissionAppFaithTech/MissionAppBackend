import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const updateWorkAddressValidator = vine.create({
  zip: text(1, 20),
  district: text(),
  city: text(),
  state: text(),
  country: text(),
})
