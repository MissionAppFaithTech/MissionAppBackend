import { DEVICE_ID_MAX_LENGTH, DEVICE_ID_MIN_LENGTH } from '#constants/refresh_token'
import vine from '@vinejs/vine'

/** Identificador aleatório do aparelho (`x-device-id`, ADR-0038): só caracteres base64url. */
export const deviceId = () =>
  vine
    .string()
    .trim()
    .minLength(DEVICE_ID_MIN_LENGTH)
    .maxLength(DEVICE_ID_MAX_LENGTH)
    .regex(/^[\w-]+$/)
