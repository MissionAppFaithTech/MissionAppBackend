import vine from '@vinejs/vine'
import { cursor } from '#validators/shared/fields/cursor'
import { limit } from '#validators/shared/fields/limit'

export const cursorPaginationSchema = () => vine.object({ cursor: cursor(), limit: limit() })
