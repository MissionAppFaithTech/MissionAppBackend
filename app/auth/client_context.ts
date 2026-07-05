import { DeviceType } from '#enums/refresh_token/device_type'
import type { DeviceMetadata } from '#services/refresh_token_service'
import { DEVICE_NAME_MAX_LENGTH } from '#constants/refresh_token'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Metadados do cliente extraídos da requisição — usados apenas para a
 * política de TTL do refresh token (mobile vs web) e para exibição na
 * listagem de sessões ativas. Não determina mais o formato de entrega dos
 * tokens: a API sempre retorna access e refresh token no corpo da resposta,
 * já que o consumidor web é um BFF (Next.js) e não um browser — ver ADR-0021.
 */
export function clientMetadata(ctx: HttpContext): DeviceMetadata {
  const deviceType =
    ctx.request.header('x-client-type') === 'mobile' ? DeviceType.MOBILE : DeviceType.WEB

  return {
    deviceType,
    deviceName: ctx.request.header('x-device-name')?.slice(0, DEVICE_NAME_MAX_LENGTH) ?? null,
    ipAddress: ctx.request.ip(),
  }
}
