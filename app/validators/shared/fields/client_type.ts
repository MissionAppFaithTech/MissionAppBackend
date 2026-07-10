import vine from '@vinejs/vine'
import { DeviceType } from '#enums/refresh_token/device_type'

/** Valida contra os próprios membros de `DeviceType` — sem duplicar a lista de valores. */
export const clientType = () => vine.enum(DeviceType)
