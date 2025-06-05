import vine from '@vinejs/vine'
import { page } from '#validators/shared/fields/page'
import { perPage } from '#validators/shared/fields/per_page'

export const paginationSchema = () => vine.object({ page: page(), perPage: perPage() })
