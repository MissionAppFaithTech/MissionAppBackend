import { password } from '#validators/shared/fields/password'
import vine from '@vinejs/vine'

export const changePasswordValidator = vine.create({
  currentPassword: vine.string(),
  newPassword: password().confirmed({ as: 'newPasswordConfirmation' }),
})
