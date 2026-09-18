import { searchFilterFields } from '#validators/shared/fields/address'
import vine from '@vinejs/vine'

export const listFaithCommunitiesValidator = vine.create(searchFilterFields())
