import { Gender } from '#enums/user/gender'
import { email } from '#validators/shared/fields/email'
import { password } from '#validators/shared/fields/password'
import { phoneNumber } from '#validators/shared/fields/phone_number'
import { text } from '#validators/shared/fields/text'
import { username } from '#validators/shared/fields/username'
import vine from '@vinejs/vine'

export const signupValidator = vine.create({
  fullName: text(),
  username: username().unique({ table: 'users', column: 'username' }),
  phoneNumber: phoneNumber(),
  gender: vine.enum(Object.values(Gender)),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password().confirmed({ as: 'passwordConfirmation' }),
})
