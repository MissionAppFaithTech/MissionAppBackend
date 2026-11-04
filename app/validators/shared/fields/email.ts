import vine from '@vinejs/vine'

export const email = () =>
  vine.string().trim().email().normalizeEmail({ gmail_remove_dots: false }).maxLength(254)
