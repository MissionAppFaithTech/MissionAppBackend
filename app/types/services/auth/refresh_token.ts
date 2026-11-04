import type { DeviceKind } from '#enums/refresh_token/device_kind'
import type { DeviceType } from '#enums/refresh_token/device_type'

/**
 * Metadados do dispositivo/cliente associados a um refresh token — usados
 * para a política de TTL (sliding window por tipo de dispositivo) e para
 * exibição na listagem de sessões ativas (ver ADR-0021).
 */
export type DeviceMetadata = {
  deviceType: DeviceType
  deviceName?: string | null
  ipAddress?: string | null
  /** Identificador bruto do aparelho (`x-device-id`); só o hash é persistido (ADR-0038). */
  deviceId?: string | null
  deviceKind?: DeviceKind | null
}
