import { IdentityType } from '#enums/missionary/identity_type'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const updateIdentityValidator = vine.create({
  identityType: vine.enum(Object.values(IdentityType)),
  identityDocument: text(1, 50),
})
