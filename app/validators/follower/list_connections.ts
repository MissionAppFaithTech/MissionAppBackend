import { cursor } from '#validators/shared/fields/cursor'
import { limit } from '#validators/shared/fields/limit'
import vine from '@vinejs/vine'

/** Seguidores ou "seguindo" por cursor (ADR-0033): mais recentes primeiro. */
export const listConnectionsValidator = vine.create({
  cursor: cursor(),
  limit: limit(),
})
