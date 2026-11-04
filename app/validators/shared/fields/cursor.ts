import { CURSOR_MAX_LENGTH } from '#constants/pagination'
import vine from '@vinejs/vine'

// NOTE: o cursor é opaco para o cliente; o formato é validado ao decodificar
// (`decodeCursor`), que responde E_INVALID_CURSOR.
export const cursor = () => vine.string().trim().maxLength(CURSOR_MAX_LENGTH).optional()
