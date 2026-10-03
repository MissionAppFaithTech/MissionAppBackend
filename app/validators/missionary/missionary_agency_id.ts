import { id } from '#validators/shared/fields/id'
import vine from '@vinejs/vine'

export const missionaryAgencyIdValidator = vine.create({
  params: vine.object({
    id: id(),
  }),
})
