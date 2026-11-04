import { DeviceKind } from '#enums/refresh_token/device_kind'
import vine from '@vinejs/vine'

/** Tipo de aparelho (`x-device-kind`, ADR-0038). */
export const deviceKind = () => vine.enum(DeviceKind)
