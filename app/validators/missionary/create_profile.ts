import { id } from '#validators/shared/fields/id'
import vine from '@vinejs/vine'

export const createMissionaryProfileValidator = vine.create({
  missionaryAgencyId: id(),
})