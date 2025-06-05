import { password } from '#validators/shared/fields/password'
import vine from '@vinejs/vine'

export const resetPasswordValidator = vine.create({
  token: vine.string(),
  newPassword: password().confirmed({ as: 'newPasswordConfirmation' }),
})
