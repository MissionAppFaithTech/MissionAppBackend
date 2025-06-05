import vine from '@vinejs/vine'

export const perPage = () => vine.number().positive().withoutDecimals().max(100).optional()
