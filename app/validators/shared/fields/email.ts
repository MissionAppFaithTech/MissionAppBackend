import vine from '@vinejs/vine'

export const email = () => vine.string().email().maxLength(254)
