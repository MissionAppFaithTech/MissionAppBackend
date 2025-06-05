import vine from '@vinejs/vine'

export const email = () => vine.string().trim().email().normalizeEmail().maxLength(254)
