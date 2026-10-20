import { id } from '#validators/shared/fields/id'
import { page } from '#validators/shared/fields/page'
import { perPage } from '#validators/shared/fields/per_page'
import vine from '@vinejs/vine'

export const listPostsValidator = vine.create({
  missionaryId: id().optional(),
  page: page(),
  perPage: perPage(),
})
