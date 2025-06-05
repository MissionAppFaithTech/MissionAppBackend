import { DEVICE_NAME_MAX_LENGTH } from '#constants/refresh_token'
import vine from '@vinejs/vine'

export const deviceName = () => vine.string().trim().maxLength(DEVICE_NAME_MAX_LENGTH)
