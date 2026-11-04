import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import { workAddressFields } from '#validators/shared/fields/work_address'
import vine from '@vinejs/vine'

// NOTE: `.nullable()` permite limpar o campo enviando `null` (ou "", convertido em
// null globalmente); sem ele o VineJS descarta o null e o valor antigo permanece
export const updateAboutValidator = vine.create({
  aboutMe: vine.string().trim().maxLength(5000).nullable().optional(),
  missionStorySummary: vine.string().trim().maxLength(5000).nullable().optional(),
  originLocation: text(1, 255).nullable().optional(),
  faithCommunityId: id().nullable().optional(),
  // NOTE: sem `.nullable()` — `missionaries.missionary_agency_id` é NOT NULL
  missionaryAgencyId: id().optional(),
  workAddress: vine.object(workAddressFields()).optional(),
  prayerRequest: vine.string().trim().maxLength(5000).nullable().optional(),
  lifeVerse: text(1, 255).nullable().optional(),
})
