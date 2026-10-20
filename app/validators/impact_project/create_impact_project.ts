import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const createImpactProjectValidator = vine.create({
  missionaryId: id().optional(),
  title: text(1, 255),
  description: text(1, 10000),
  coverImageAssetId: id(),
  videoAssetId: id().optional(),
})
