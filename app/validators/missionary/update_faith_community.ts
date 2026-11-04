import { addressFields } from '#validators/shared/fields/address'
import { id } from '#validators/shared/fields/id'
import { phoneNumber } from '#validators/shared/fields/phone_number'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

// NOTE: `pastorName: null` remove o pastor; `pastorPhone: null` só limpa o telefone
export const updateFaithCommunityValidator = vine.create({
  params: vine.object({
    id: id(),
  }),
  name: text(1, 255).optional(),
  phoneNumber: phoneNumber().optional(),
  pastorName: text(1, 255).nullable().optional(),
  pastorPhone: phoneNumber().nullable().optional(),
  ...addressFields(),
})
