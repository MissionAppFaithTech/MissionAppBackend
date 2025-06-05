import vine from '@vinejs/vine'

export const refreshValidator = vine.create({
  refreshToken: vine.string(),
})
