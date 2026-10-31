import { email } from '#validators/shared/fields/email'
import { phoneNumber } from '#validators/shared/fields/phone_number'
import vine from '@vinejs/vine'

// NOTE: `.nullable()` permite limpar o campo enviando `null` (ou "", convertido em
// null globalmente); sem ele o VineJS descarta o null e o valor antigo permanece
export const updateProfileValidator = vine.create({
  publicEmail: email().nullable().optional(),
  publicPhone: phoneNumber().nullable().optional(),
  donationMessage: vine.string().trim().maxLength(5000).nullable().optional(),
})
