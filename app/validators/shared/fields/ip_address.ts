import vine from '@vinejs/vine'

export const ipAddress = () => vine.string().ipAddress()
