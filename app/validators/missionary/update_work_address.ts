import { workAddressFields } from '#validators/shared/fields/work_address'
import vine from '@vinejs/vine'

export const updateWorkAddressValidator = vine.create(workAddressFields())
