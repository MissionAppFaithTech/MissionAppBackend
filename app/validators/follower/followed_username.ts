import { usernameReference } from '#validators/shared/fields/username_reference'
import vine from '@vinejs/vine'

export const followedUsernameValidator = vine.create({
  params: vine.object({
    username: usernameReference(),
  }),
})
