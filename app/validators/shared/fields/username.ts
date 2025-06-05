import vine from '@vinejs/vine'

export const username = () =>
  vine
    .string()
    .trim()
    .minLength(3)
    .maxLength(32)
    .regex(/^[a-z0-9_]+$/)
