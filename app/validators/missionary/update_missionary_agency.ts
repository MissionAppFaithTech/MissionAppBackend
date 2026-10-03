import { addressFields } from '#validators/shared/fields/address'
import { id } from '#validators/shared/fields/id'
import { phoneNumber } from '#validators/shared/fields/phone_number'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const updateMissionaryAgencyValidator = vine.create({
  params: vine.object({
    id: id(),
  }),
  name: text(1, 255).optional(),
  phoneNumber: phoneNumber().optional(),
  ...addressFields(),
})
