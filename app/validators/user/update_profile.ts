import { id } from '#validators/shared/fields/id'
import { text } from '#validators/shared/fields/text'
import { username } from '#validators/shared/fields/username'
import vine from '@vinejs/vine'

export const updateProfileValidator = vine.create({
  fullName: text().optional(),
  username: username().optional(),
  // NOTE: `.nullable()` permite limpar a biografia enviando `null` (ou "", convertido
  // em null globalmente); sem ele o VineJS descarta o null e o valor antigo permanece
  // NOTE: minibiografia do cabeçalho do perfil, limitada a 70 caracteres (regra de produto)
  biography: vine.string().trim().maxLength(70).nullable().optional(),
  profilePictureId: id().optional(),
})
