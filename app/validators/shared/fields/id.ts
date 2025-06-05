import vine from '@vinejs/vine'

export const id = () => vine.string().uuid({ version: [7] })
