import { cursor } from '#validators/shared/fields/cursor'
import { id } from '#validators/shared/fields/id'
import { limit } from '#validators/shared/fields/limit'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

/** Lista por cursor (ADR-0033): mais recentes primeiro, até 20 por página. */
export const listImpactProjectsValidator = vine.create({
  search: text(1, 255).optional(),
  missionaryId: id().optional(),
  cursor: cursor(),
  limit: limit(),
})
