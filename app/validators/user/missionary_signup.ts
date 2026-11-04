import { IdentityType } from '#enums/missionary/identity_type'
import { faithCommunityFields } from '#validators/missionary/create_faith_community'
import { missionaryAgencyFields } from '#validators/missionary/create_missionary_agency'
import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import { signupFields } from '#validators/user/signup'
import vine from '@vinejs/vine'

// NOTE: agência e comunidade chegam como id de um item do catálogo ou como
// objeto para cadastrar um novo; o service exige exatamente uma forma da agência
// e no máximo uma da comunidade
export const missionarySignupValidator = vine.create({
  ...signupFields(),
  birthDate: vine.date({ formats: ['YYYY-MM-DD'] }).before('today'),
  identityType: vine
    .enum(Object.values(IdentityType))
    .optional()
    .requiredIfExists('identityDocument'),
  identityDocument: text(1, 50).optional().requiredIfExists('identityType'),
  aboutMe: vine.string().trim().maxLength(5000).optional(),
  missionaryAgencyId: id().optional(),
  missionaryAgency: vine.object(missionaryAgencyFields()).optional(),
  faithCommunityId: id().optional(),
  faithCommunity: vine.object(faithCommunityFields()).optional(),
})
