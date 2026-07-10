import { email } from '#validators/shared/fields/email'
import vine from '@vinejs/vine'

export const forgotPasswordValidator = vine.create({
  login: email(),
})
