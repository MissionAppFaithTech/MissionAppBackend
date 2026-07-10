import { DeviceType } from '#enums/refresh_token/device_type'
import env from '#start/env'
import { parseDurationToDays } from '#utils/duration'

/**
 * TTL de refresh token, em dias, de acordo com o tipo de dispositivo — mobile
 * e web têm políticas de expiração configuradas separadamente
 * (`JWT_REFRESH_EXPIRES_IN_MOBILE`/`JWT_REFRESH_EXPIRES_IN_WEB`).
 *
 * @param deviceType Tipo de dispositivo do refresh token.
 * @returns TTL em dias.
 * @example
 * refreshTokenTtlInDays(DeviceType.MOBILE) // 30
 */
export function refreshTokenTtlInDays(deviceType: DeviceType): number {
  const raw =
    deviceType === DeviceType.MOBILE
      ? env.get('JWT_REFRESH_EXPIRES_IN_MOBILE')
      : env.get('JWT_REFRESH_EXPIRES_IN_WEB')

  return parseDurationToDays(raw)
}
