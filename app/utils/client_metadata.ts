import { DeviceType } from '#enums/refresh_token/device_type'
import type { RequestContext } from '#types/http/context'
import type { DeviceMetadata } from '#types/services/auth/refresh_token'
import { requestValidationData } from '#utils/request_validation_data'
import { clientMetadataValidator } from '#validators/shared/schemas/client_metadata'

/**
 * Deriva o `DeviceMetadata` diretamente da requisição — valida os headers de
 * metadados de cliente (`x-client-type`, `x-device-name`) e o IP computado
 * pelo framework, sem depender do validator do domínio (login, signup,
 * refresh) ter incluído esses campos no seu próprio schema. `ipAddress` não
 * faz parte do merge automático de `request.validateUsing()`, por isso o
 * `data` explícito via `requestValidationData()`.
 *
 * @param request Objeto de requisição do `HttpContext`.
 * @returns `DeviceMetadata` derivado da requisição — `deviceType` cai para
 *          `DeviceType.WEB` quando `x-client-type` está ausente.
 */
export async function toDeviceMetadata(request: RequestContext): Promise<DeviceMetadata> {
  const validated = await request.validateUsing(clientMetadataValidator(), {
    data: requestValidationData(request),
  })

  return {
    deviceType: validated.headers['x-client-type'] ?? DeviceType.WEB,
    deviceName: validated.headers['x-device-name'] ?? null,
    ipAddress: validated.ipAddress,
  }
}
