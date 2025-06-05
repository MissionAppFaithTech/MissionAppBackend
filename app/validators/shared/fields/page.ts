import vine from '@vinejs/vine'

export const page = () => vine.number().positive().withoutDecimals().optional()
