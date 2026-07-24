import { email } from '#validators/shared/fields/email'
import { phoneNumber } from '#validators/shared/fields/phone_number'
import vine from '@vinejs/vine'

export const updateProfileValidator = vine.create({
  publicEmail: email().optional(),
  publicPhone: phoneNumber().optional(),
  donationMessage: vine.string().trim().maxLength(5000).optional(),
})
