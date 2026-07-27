import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import vine from '@vinejs/vine'

export const updateAboutValidator = vine.create({
  aboutMe: vine.string().trim().maxLength(5000).optional(),
  missionStorySummary: vine.string().trim().maxLength(5000).optional(),
  originLocation: text(1, 255).optional(),
  faithCommunityId: id().optional(),
  prayerRequest: vine.string().trim().maxLength(5000).optional(),
  lifeVerse: text(1, 255).optional(),
})
