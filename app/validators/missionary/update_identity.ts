import { IdentityType } from '#enums/missionary/identity_type'
import { identityDocument } from '#validators/shared/fields/identity'
import vine from '@vinejs/vine'

export const updateIdentityValidator = vine.create({
  identityType: vine.enum(Object.values(IdentityType)),
  identityDocument: identityDocument(),
})
