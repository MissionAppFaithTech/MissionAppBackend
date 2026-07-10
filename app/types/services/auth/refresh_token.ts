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
}
