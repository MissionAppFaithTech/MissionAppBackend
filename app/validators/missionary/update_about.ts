import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

// NOTE: `.nullable()` permite limpar o campo enviando `null` (ou "", convertido em
// null globalmente); sem ele o VineJS descarta o null e o valor antigo permanece
export const updateAboutValidator = vine.create({
  aboutMe: vine.string().trim().maxLength(5000).nullable().optional(),
  missionStorySummary: vine.string().trim().maxLength(5000).nullable().optional(),
  originLocation: text(1, 255).nullable().optional(),
  faithCommunityId: id().nullable().optional(),
  prayerRequest: vine.string().trim().maxLength(5000).nullable().optional(),
  lifeVerse: text(1, 255).nullable().optional(),
})
