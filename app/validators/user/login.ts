import { email } from '#validators/shared/fields/email'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const loginValidator = vine.create({
  email: email(),
  password: text(8, 128),
})
