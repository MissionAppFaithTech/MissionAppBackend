import { usernameReference } from '#validators/shared/fields/username_reference'
import vine from '@vinejs/vine'

export const followMissionaryValidator = vine.create({
  username: usernameReference(),
})
