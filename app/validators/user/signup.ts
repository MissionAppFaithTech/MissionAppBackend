import vine from '@vinejs/vine'
import { email } from '#validators/shared/fields/email'
import { password } from '#validators/shared/fields/password'

export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password().confirmed({ as: 'password_confirmation' }),
})
