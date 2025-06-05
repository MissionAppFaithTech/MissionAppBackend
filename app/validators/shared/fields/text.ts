import vine from '@vinejs/vine'

export const text = (minLength = 1, maxLength = 255) =>
  vine.string().minLength(minLength).maxLength(maxLength).trim()
