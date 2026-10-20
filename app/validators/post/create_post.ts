import { POST_IMAGES_PER_MISSIONARY_LIMIT } from '#constants/post'
import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const createPostValidator = vine.create({
  missionaryId: id().optional(),
  content: text(1, 5000),
  highlightLink: vine.string().trim().url().maxLength(255).optional(),
  imageAssetIds: vine.array(id()).maxLength(POST_IMAGES_PER_MISSIONARY_LIMIT).distinct().optional(),
})
