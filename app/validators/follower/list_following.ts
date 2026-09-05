import { paginationSchema } from '#validators/shared/schemas/pagination'
import vine from '@vinejs/vine'

export const listFollowingValidator = vine.create(paginationSchema())
