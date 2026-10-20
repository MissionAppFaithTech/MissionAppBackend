import { id } from '#validators/shared/fields/id'
import { page } from '#validators/shared/fields/page'
import { perPage } from '#validators/shared/fields/per_page'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const listImpactProjectsValidator = vine.create({
  search: text(1, 255).optional(),
  missionaryId: id().optional(),
  page: page(),
  perPage: perPage(),
})
