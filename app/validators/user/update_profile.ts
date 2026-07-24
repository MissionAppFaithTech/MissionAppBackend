import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import { username } from '#validators/shared/fields/username'
import vine from '@vinejs/vine'

export const updateProfileValidator = vine.create({
  fullName: text().optional(),
  username: username().optional(),
  biography: vine.string().trim().maxLength(200).optional(),
  profilePictureId: id().optional(),
})
