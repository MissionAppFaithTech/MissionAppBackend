import { cursor } from '#validators/shared/fields/cursor'
import { id } from '#validators/shared/fields/id'
import { limit } from '#validators/shared/fields/limit'
import vine from '@vinejs/vine'

/** Seguidores/seguindo por cursor (ADR-0033): quem seguiu mais recentemente primeiro. */
export const listFollowsValidator = vine.create({
  params: vine.object({
    id: id(),
  }),
  cursor: cursor(),
  limit: limit(),
})
