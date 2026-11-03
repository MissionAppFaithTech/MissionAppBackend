import { CURSOR_PAGE_MAX_LIMIT } from '#constants/pagination'
import vine from '@vinejs/vine'

export const limit = () =>
  vine.number().positive().withoutDecimals().max(CURSOR_PAGE_MAX_LIMIT).optional()
