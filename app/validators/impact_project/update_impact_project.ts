import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const updateImpactProjectValidator = vine.create({
  params: vine.object({
    id: id(),
  }),
  title: text(1, 255).optional(),
  description: text(1, 10000).optional(),
  coverImageAssetId: id().optional(),
  videoAssetId: id().nullable().optional(),
})
