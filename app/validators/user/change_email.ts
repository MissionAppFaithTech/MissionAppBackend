import { email } from '#validators/shared/fields/email'
import vine from '@vinejs/vine'

export const changeEmailValidator = vine.create({
  email: email(),
  currentPassword: vine.string(),
})
