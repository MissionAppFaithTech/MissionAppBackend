import { usernameReference } from '#validators/shared/fields/username_reference'
import vine from '@vinejs/vine'

/** Username do perfil público na URL. */
export const publicMissionaryProfileValidator = vine.create({
  params: vine.object({
    username: usernameReference(),
  }),
})
