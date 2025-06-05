import vine from '@vinejs/vine'

export const password = () => vine.string().minLength(8).maxLength(32)
