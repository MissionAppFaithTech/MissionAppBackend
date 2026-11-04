import { addressFields } from '#validators/shared/fields/address'
import { phoneNumber } from '#validators/shared/fields/phone_number'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

/** Campos de cadastro de uma agência missionária. */
export const missionaryAgencyFields = () => ({
  name: text(1, 255),
  phoneNumber: phoneNumber().optional(),
  ...addressFields(),
})

export const createMissionaryAgencyValidator = vine.create(missionaryAgencyFields())
