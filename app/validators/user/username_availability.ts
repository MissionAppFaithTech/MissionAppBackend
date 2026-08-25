import { username } from '#validators/shared/fields/username'
import vine from '@vinejs/vine'

export const usernameAvailabilityValidator = vine.create({
  username: username(),
})
