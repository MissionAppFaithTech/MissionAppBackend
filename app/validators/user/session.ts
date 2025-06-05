import { id } from '#validators/shared/fields/id'
import vine from '@vinejs/vine'

export const sessionValidator = vine.create({
  params: vine.object({
    familyId: id(),
  }),
})
