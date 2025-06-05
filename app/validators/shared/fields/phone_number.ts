import vine from '@vinejs/vine'

/** Formato E.164 (ex: "+5511912345678") — mesmo formato usado em `users.phone_number`. */
export const phoneNumber = () =>
  vine
    .string()
    .trim()
    .regex(/^\+[1-9]\d{1,14}$/)
